import axios from "axios";
import * as cheerio from "cheerio";
import { ResponseStart, ResponseAnswer, AnswerAlternatives } from "./types";
import { AkinatorLanguage, Answer, AkinatorUrlType } from "./object";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

type AkinatorLanguageType =
    (typeof AkinatorLanguage)[keyof typeof AkinatorLanguage];
type AkinatorUrlTypeType =
    (typeof AkinatorUrlType)[keyof typeof AkinatorUrlType];

function normalizeAnswer(answer: AnswerAlternatives): number {
    if (typeof answer === "number") {
        if (Object.values(Answer).includes(answer)) {
            return answer;
        }
        throw new Error("Invalid answer");
    }

    switch (answer.toLowerCase()) {
        case "y":
        case "yes":
            return Answer.Yes;
        case "n":
        case "no":
            return Answer.No;
        case "idk":
        case "i don't know":
            return Answer.IdontKnow;
        case "p":
        case "probably":
            return Answer.Probably;
        case "pn":
        case "probably not":
            return Answer.ProbablyNot;
        default:
            if (answer in Answer) {
                return Answer[answer as keyof typeof Answer];
            }
            throw new Error("Invalid answer");
    }
}

class AkinatorCache {
    private readonly cacheDir: string;
    private readonly cacheFile: string;
    private readonly cacheDuration = 10 * 60 * 1000;

    constructor() {
        const projectRoot = process.cwd();
        this.cacheDir = path.join(projectRoot, "cache");
        this.cacheFile = path.join(this.cacheDir, "akinator.json");
        this.ensureCacheDir();
    }

    private async ensureCacheDir(): Promise<void> {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error("Error creating cache directory:", error);
        }
    }

    async set(key: string, value: any): Promise<void> {
        try {
            const cacheObject = await this.loadFromFile();
            if (cacheObject[key]) {
                cacheObject[key].data = value;
                cacheObject[key].expiry = Date.now() + this.cacheDuration;
            } else {
                cacheObject[key] = {
                    data: value,
                    expiry: Date.now() + this.cacheDuration
                };
            }
            await this.saveToFile(cacheObject);
        } catch (error) {
            console.error("Error setting cache item:", error);
        }
    }

    async get(key: string): Promise<any | null> {
        try {
            const cacheObject = await this.loadFromFile();
            const item = cacheObject[key];
            if (item && item.expiry > Date.now()) {
                return item.data;
            }
            return null;
        } catch (error) {
            console.error("Error getting cache item:", error);
            return null;
        }
    }
    async delete(key: string): Promise<void> {
        try {
            const cacheObject = await this.loadFromFile();
            delete cacheObject[key];
            await this.saveToFile(cacheObject);
        } catch (error) {
            console.error("Error deleting cache item:", error);
        }
    }
    private async saveToFile(cacheObject: Record<string, any>): Promise<void> {
        await fs.writeFile(
            this.cacheFile,
            JSON.stringify(cacheObject, null, 2),
            "utf-8"
        );
    }

    private async loadFromFile(): Promise<Record<string, any>> {
        try {
            const data = await fs.readFile(this.cacheFile, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading cache from file:", error);
            return {};
        }
    }

    async clearCache(): Promise<void> {
        try {
            await fs.unlink(this.cacheFile);
        } catch (error) {
            console.error("Error clearing cache:", error);
        }
    }
}

export class Akinator {
    private baseUrl: string;
    private answerUrl: string;
    private backUrl: string;
    private signature: string;
    private session: string;
    private question: string;
    private id: string;
    private cache: AkinatorCache;
    private childMode: boolean;
    private readonly headers: { [key: string]: string };

    constructor(
        language: AkinatorLanguageType = AkinatorLanguage.English,
        childMode: boolean = false
    ) {
        this.baseUrl = this.getUrl(language, AkinatorUrlType.Game);
        this.answerUrl = this.getUrl(language, AkinatorUrlType.Answer);
        this.backUrl = this.getUrl(language, AkinatorUrlType.Back);
        this.signature = "";
        this.session = "";
        this.question = "";
        this.cache = new AkinatorCache();
        this.id = uuidv4();
        this.childMode = childMode;
        this.headers = {
            "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        };
    }

    private getUrl(
        language: AkinatorLanguageType,
        urlType: AkinatorUrlTypeType
    ): string {
        return `https://${language}.akinator.com/${urlType}`;
    }

    async startGame(): Promise<ResponseStart> {
        try {
            const response = await axios.post(
                this.baseUrl,
                new URLSearchParams({
                    cm: this.childMode.toString(),
                    sid: "1"
                }),
                {
                    headers: this.headers
                }
            );

            const $ = cheerio.load(response.data);

            this.question = $("#question-label").text();

            this.session = $(
                'form#askSoundlike input[name="session"]'
            ).val() as string;

            this.signature = $(
                'form#askSoundlike input[name="signature"]'
            ).val() as string;

            if (!this.session || !this.signature) {
                return {
                    ok: false,
                    result: {
                        error: "Error starting game: Session or signature missing"
                    }
                };
            }

            await this.cache.set(this.id, {
                session: this.session,
                signature: this.signature,
                progress: "0.00000",
                step: 0
            });

            return {
                ok: true,
                result: {
                    id: this.id,
                    question: this.question
                }
            };
        } catch (error) {
            console.error("Error in startGame:", error);
            return {
                ok: false,
                result: {
                    error:
                        error instanceof Error ? error.message : String(error)
                }
            };
        }
    }

    async answerQuestion(
        answer: AnswerAlternatives,
        id: string
    ): Promise<ResponseAnswer> {
        try {
            const normalizedAnswer = normalizeAnswer(answer);
            const cacheItem = await this.cache.get(id);
            if (!cacheItem) {
                throw new Error(
                    "Game session not found. Please start a new game."
                );
            }

            const response = await axios.post(
                this.answerUrl,
                new URLSearchParams({
                    step: cacheItem.step.toString(),
                    progression: cacheItem.progress.toString(),
                    answer: normalizedAnswer.toString(),
                    session: cacheItem.session,
                    signature: cacheItem.signature,
                    question_filter: "string",
                    sid: "NaN",
                    cm: this.childMode.toString(),
                    step_last_proposition: ""
                }),
                {
                    headers: this.headers
                }
            );
            if (response.data && !response.data.valide_contrainte) {
                await this.cache.set(id, {
                    ...cacheItem,
                    step: response.data.step,
                    progress: response.data.progression
                });

                return {
                    ok: true,
                    result: {
                        id: id,
                        progress: response.data.progression,
                        step: response.data.step,
                        question: response.data.question
                    }
                };
            } else if (response.data && response.data.valide_contrainte) {
                await this.cache.delete(id);
                return {
                    ok: true,
                    result: {
                        id: id,
                        photo: response.data.photo,
                        description: response.data.description_proposition,
                        name: response.data.name_proposition
                    }
                };
            } else {
                throw new Error("No data received from Akinator API");
            }
        } catch (error) {
            return {
                ok: false,
                result: {
                    error:
                        error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
    async back(id: string): Promise<ResponseAnswer> {
        try {
            const cacheItem = await this.cache.get(id);
            if (!cacheItem) {
                throw new Error(
                    "Game session not found. Please start a new game."
                );
            }

            const response = await axios.post(
                this.backUrl,
                new URLSearchParams({
                    step: cacheItem.step.toString(),
                    progression: cacheItem.progress.toString(),
                    session: cacheItem.session,
                    signature: cacheItem.signature,
                    cm: this.childMode.toString()
                }),
                {
                    headers: this.headers
                }
            );

            if (response.data) {
                await this.cache.set(id, {
                    ...cacheItem,
                    step: response.data.step,
                    progress: response.data.progression
                });
                return {
                    ok: true,
                    result: {
                        id: id,
                        progress: response.data.progression,
                        step: response.data.step,
                        question: response.data.question
                    }
                };
            } else {
                throw new Error("No data received from Akinator API");
            }
        } catch (error) {
            return {
                ok: false,
                result: {
                    error:
                        error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
}

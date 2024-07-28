import { ResponseStart, ResponseAnswer, AnswerAlternatives } from "./types";
import { AkinatorLanguage } from "./enum";
export declare class Akinator {
    private baseUrl;
    private answerUrl;
    private backUrl;
    private signature;
    private session;
    private question;
    private id;
    private cache;
    private childMode;
    private readonly headers;
    constructor(language?: AkinatorLanguage, childMode?: boolean);
    private getUrl;
    startGame(): Promise<ResponseStart>;
    answerQuestion(answer: AnswerAlternatives, id: string): Promise<ResponseAnswer>;
    back(id: string): Promise<ResponseAnswer>;
}

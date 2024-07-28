import { Answer } from "./enum";
export interface ResponseStart {
    ok: boolean;
    result: {
        id?: string;
        question?: string;
        error?: any;
    };
}
export interface ResponseAnswer {
    ok: boolean;
    result: {
        id?: string;
        progress?: number;
        step?: number;
        question?: string;
        error?: any;
        photo?: string;
        description?: string;
        name?: string;
    };
}
export interface AkinatorHeaders {
    readonly "user-agent": string;
}
export type AnswerAlternatives = Answer | "y" | "yes" | "n" | "no" | "idk" | "i don't know" | "p" | "probably" | "pn" | "probably not";

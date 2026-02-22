"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.model = void 0;
exports.getInitialContext = getInitialContext;
var openai_1 = require("@ai-sdk/openai");
exports.model = (0, openai_1.openai)('gpt-4o');
function getInitialContext() {
    return {
        resume: {
            skills: [],
            experience: [],
            education: [],
        },
        githubData: [],
        discrepancies: [],
        jdMatchScore: 0,
        signatureMatch: '',
    };
}

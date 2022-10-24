"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
console.log("Running file");
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const date_fns_1 = require("date-fns");
dotenv_1.default.config();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => {
    ctx.reply(`This bot only works in inline mode. \nType @${ctx.me} [your module search term] in any chat to use it. \n\nFor example, to search for all modules containing 'GEA', type \n@${ctx.me} GEA`);
});
bot.on("inline_query", async (ctx) => {
    try {
        const query = ctx.inlineQuery.query.trim().toUpperCase();
        if (query.length < 2)
            return;
        const moduleListResponse = await (0, node_fetch_1.default)("https://api.nusmods.com/v2/2022-2023/moduleInfo.json");
        const moduleList = await moduleListResponse.json();
        const filteredList = moduleList.filter((module) => module.moduleCode.toUpperCase().includes(query) ||
            module.title.toUpperCase().includes(query));
        // lowest moduleCode number first.
        // Note that we don't have to sort by alphabetical module code because it's
        // already sorted alphabetically from NUSMods.
        const sortedList = filteredList.sort((a, b) => {
            // remove all non-numeric characters
            const aCode = a.moduleCode.replace(/\D/g, "");
            const bCode = b.moduleCode.replace(/\D/g, "");
            return parseInt(aCode) - parseInt(bCode);
        });
        const result = sortedList.map((module) => {
            return {
                type: "article",
                id: module.moduleCode,
                title: `${module.moduleCode} - ${module.title}`,
                input_message_content: {
                    message_text: buildMessage(module),
                    parse_mode: "HTML",
                },
            };
        });
        // limit results to 50.
        const trimmedResults = result.slice(0, 50);
        ctx.answerInlineQuery(trimmedResults, {
            cache_time: 0,
        });
    }
    catch (e) {
        console.log(e);
    }
});
function buildMessage(module) {
    let msg = `<b><u><a href='https://nusmods.com/modules/${module.moduleCode}'>${module.moduleCode} ${module.title}</a></u></b>\n`;
    msg += `${module.department}, ${module.faculty}\n`;
    msg += `${module.moduleCredit} MC ${module.attributes?.su ? "(Eligible for S/U)" : "(Ineligible for S/U)"}\n\n`;
    if (module.semesterData.length === 0) {
        msg += `This module is not offered in this academic year!`;
    }
    else {
        msg += `Offered in ${module.semesterData
            .map((sem) => convertSemesterNumber(sem.semester))
            .join(", ")}\n\n`;
        msg += module.semesterData
            .map((sem) => {
            if (sem.examDate) {
                return `${convertSemesterNumber(sem.semester)} Exam: ${(0, date_fns_1.format)((0, date_fns_1.addHours)(new Date(sem.examDate || new Date()), 8), // workaround for timezone issue (server set to UTC+0)
                "dd MMM yyyy h:mm a")} ${sem.examDuration && `(${sem.examDuration / 60} hrs)`}`;
            }
            else {
                return `${convertSemesterNumber(sem.semester)} Exam: No exam`;
            }
        })
            .join("\n");
    }
    msg += `\n\n`;
    // let semestersWithExams = module.semesterData.filter((sem) => sem.examDate);
    // if (semestersWithExams.length) {
    //     msg += semestersWithExams
    //         .map(
    //             (sem) =>
    //                 `${convertSemesterNumber(sem.semester)} Exam: ${format(
    //                     addHours(new Date(sem.examDate || new Date()), 8), // workaround for timezone issue (server set to UTC+0)
    //                     "dd MMM yyyy h:mm a"
    //                 )} ${
    //                     sem.examDuration && `(${sem.examDuration / 60} hrs)\n`
    //                 }`
    //         )
    //         .join("");
    //     msg += "\n";
    // } else {
    //     msg += `No exams for this module.\n\n`;
    // }
    msg += `${module.description ? trim(module.description, 256) : ""}`;
    return msg;
}
function trim(str, length) {
    return str.length > length ? str.substring(0, length - 3) + "..." : str;
}
function convertSemesterNumber(sem) {
    switch (sem) {
        case 1:
            return "Sem 1";
        case 2:
            return "Sem 2";
        case 3:
            return "ST 1";
        case 4:
            return "ST 2";
        default:
            return "Unknown";
    }
}
bot.launch();
//# sourceMappingURL=app.js.map
import { Context, Markup, Telegraf } from "telegraf";
import { Update } from "typegram";
console.log("Running file");

import dotenv from "dotenv";
import fetch from "node-fetch";
import { ModuleCondensed, ModuleInformation } from "./types/nusmods";
import { InlineQueryResultArticle } from "telegraf/typings/core/types/typegram";

import { addHours, format } from "date-fns";
dotenv.config();
const bot: Telegraf<Context<Update>> = new Telegraf(
    process.env.BOT_TOKEN as string
);

bot.start((ctx) => {
    ctx.reply(
        `This bot only works in inline mode. \nType @${ctx.me} [your module search term] in any chat to use it. \n\nFor example, to search for all modules containing 'GEA', type \n@${ctx.me} GEA`
    );
});
let runs = 0;

let CACHE:{
    lastUpdated?: number,
    moduleList?: ModuleInformation[]
} = {}

bot.on("inline_query", async (ctx) => {

    try {
        runs = runs + 1
        console.time(`query ${runs}`);
        
        const query = ctx.inlineQuery.query.trim().toUpperCase();
        if (query.length < 2) return console.timeEnd(`query ${runs}`);

        // if (!CACHE.lastUpdated || Date.now() - CACHE.lastUpdated > 1000 * 60 * 60 * 24) {
        //     console.log("Updating cache")
        //     const res = await fetch("https://api.nusmods.com/v2/2022-2023/moduleList.json");
        //     CACHE.moduleList = await res.json();
        //     CACHE.lastUpdated = Date.now();
        // }
        
      
        // const moduleList: ModuleInformation[] = CACHE.moduleList as ModuleInformation[];
        const res = await fetch("https://api.nusmods.com/v2/2022-2023/moduleList.json");
        const moduleList: ModuleInformation[] = await res.json();
        const filteredList = moduleList.filter(
            (module) =>
                module.moduleCode.toUpperCase().includes(query) ||
                module.title.toUpperCase().includes(query)
        );

        // lowest moduleCode number first.
        // Note that we don't have to sort by alphabetical module code because it's
        // already sorted alphabetically from NUSMods.
        const sortedList = filteredList.sort((a, b) => {
            // remove all non-numeric characters
            const aCode = a.moduleCode.replace(/\D/g, "");
            const bCode = b.moduleCode.replace(/\D/g, "");
            return parseInt(aCode) - parseInt(bCode);
        });

        const result: InlineQueryResultArticle[] = sortedList.map((module) => {
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

        await ctx.answerInlineQuery(trimmedResults, {
            cache_time: 0,
        });
        console.timeEnd(`query ${runs}`);
    } catch (e) {
        console.log(e);
    }
});

function buildMessage(module: ModuleInformation) {
    let msg = `<b><u><a href='https://nusmods.com/modules/${module.moduleCode}'>${module.moduleCode} ${module.title}</a></u></b>\n`;

    msg += `${module.department}, ${module.faculty}\n`;
    msg += `${module.moduleCredit} MC ${
        module.attributes?.su ? "(Eligible for S/U)" : "(Ineligible for S/U)"
    }\n\n`;

    if (!module.semesterData || module.semesterData.length === 0) {
        msg += `This module is not offered in this academic year!`;
    } else {
        msg += `Offered in ${module.semesterData
            .map((sem) => convertSemesterNumber(sem.semester))
            .join(", ")}\n\n`;

        msg += module.semesterData
            .map((sem) => {
                if (sem.examDate) {
                    return `${convertSemesterNumber(
                        sem.semester
                    )} Exam: ${format(
                        addHours(new Date(sem.examDate || new Date()), 8), // workaround for timezone issue (server set to UTC+0)
                        "dd MMM yyyy h:mm a"
                    )} ${sem.examDuration && `(${sem.examDuration / 60} hrs)`}`;
                } else {
                    return `${convertSemesterNumber(
                        sem.semester
                    )} Exam: No exam`;
                }
            })
            .join("\n");
    }
    
    msg += `\n\n`;

    msg += `${module.description ? trim(module.description, 256) : ""}`;

    return msg;
}

function trim(str: string, length: number) {
    return str.length > length ? str.substring(0, length - 3) + "..." : str;
}

function convertSemesterNumber(sem: number) {
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

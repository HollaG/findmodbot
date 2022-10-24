import { Context, Markup, Telegraf } from "telegraf";
import { Update } from "typegram";
console.log("Running file");

import dotenv from "dotenv";
import fetch from "node-fetch";
import { ModuleCondensed, ModuleInformation } from "./types/nusmods";
import { InlineQueryResultArticle } from "telegraf/typings/core/types/typegram";

import { addHours, format } from "date-fns";

import { Index, Document, Worker } from "flexsearch-ts";
const options = {};
let index = new Document({
    document: {
        id: "moduleCode",
        index: ["moduleCode", "title"],
    },
    tokenize: "full",
});
// let document = new Document(options);
// let worker = new Worker(options);

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

let CACHE: {
    lastUpdated?: number;
    moduleList?: ModuleInformation[];
    moduleCodeString?: string;
} = {};

let MEMO: {
    searchString: string;
    results: ModuleInformation[];
}[] = [];

bot.on("inline_query", async (ctx) => {
    try {
        runs = runs + 1;
        console.time(`query ${runs}`);

        const query = ctx.inlineQuery.query.trim().toUpperCase();
        if (query.length < 2) return console.timeEnd(`query ${runs}`);


        // Potential solution for searching (15ms improvement)
        /*
     
        if (
            !CACHE.lastUpdated ||
            Date.now() - CACHE.lastUpdated > 1000 * 60 * 60 * 24
        ) {
            // Update cache
            // first, remove all documents from index
            if (CACHE.moduleList) {
                const oldDocs = CACHE.moduleList.map((x, index) => ({
                    moduleCode: x.moduleCode.toLowerCase(),
                    title: x.title.toLowerCase(),
                    id: index,
                }));
                oldDocs.forEach((doc) => index.remove(doc));
                index.remove(oldDocs);    
            }


            const res = await fetch(
                "https://api.nusmods.com/v2/2022-2023/moduleInfo.json"
            );
            const resJ = (await res.json()) as ModuleInformation[];
            const docs = resJ.map((x, index) => ({
                moduleCode: x.moduleCode.toLowerCase(),
                title: x.title.toLowerCase(),
                id: index,
            }));
    
            docs.forEach((doc) => index.add(doc));

            CACHE.moduleList = resJ;
            CACHE.lastUpdated = Date.now();
            CACHE.moduleCodeString = CACHE.moduleList
                .map((m) => m.moduleCode)
                .join(" ");

            // Remember to invalidate MEMO
            MEMO = [];
        }


        const searchResult = index.search(query.toLowerCase(), {
            index: ["moduleCode", "title"],
        });
        // console.log(searchResult)
        const filteredModuleCodes = searchResult.flatMap((x) => x.result);
        // console.log(filteredModuleCodes)
      
        const filteredList: ModuleInformation[] = []
        filteredModuleCodes.forEach((moduleCode) => { 
            const module = CACHE.moduleList?.find((x) => x.moduleCode.toLowerCase() === moduleCode);
            if (module){
                filteredList.push(module);
            }
        })

 
        */

     
        

        if (
            !CACHE.lastUpdated ||
            Date.now() - CACHE.lastUpdated > 1000 * 60 * 60 * 24
        ) {
            console.log("Updating cache");
            const res = await fetch(
                "https://api.nusmods.com/v2/2022-2023/moduleInfo.json"
            );
            const moduleList = (await res.json()) as ModuleInformation[];
            CACHE.moduleList = moduleList;
            CACHE.lastUpdated = Date.now();
            CACHE.moduleCodeString = CACHE.moduleList
                .map((m) => m.moduleCode)
                .join(" ");

            // Remember to invalidate MEMO
            MEMO = [];
        }

        const moduleList: ModuleInformation[] =
            CACHE.moduleList as ModuleInformation[];

        let listToFilter = [];

        const matchedSubstring = MEMO.find((memo) =>
            query.includes(memo.searchString)
        );

        if (MEMO.length > 0 && matchedSubstring) {
            console.log("Found item in memo");
            listToFilter = matchedSubstring.results;
        } else {
            listToFilter = moduleList;
        }

        const filteredList = listToFilter.filter(
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

        // store the sorted list in memo
        if (MEMO.length > 25) {
            // delete the last
            MEMO.pop();
        }

        MEMO.unshift({
            searchString: query,
            results: sortedList,
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

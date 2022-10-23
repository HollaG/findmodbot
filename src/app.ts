import { Context, Markup, Telegraf } from "telegraf";
import { Update } from "typegram";
console.log("Running file");

import dotenv from "dotenv";
import fetch from "node-fetch";
import { ModuleCondensed, ModuleInformation } from "./types/nusmods";
import { InlineQueryResultArticle } from "telegraf/typings/core/types/typegram";

import { format } from "date-fns";
dotenv.config();
const bot: Telegraf<Context<Update>> = new Telegraf(
    process.env.BOT_TOKEN as string
);

bot.start((ctx) => {
    ctx.reply(
        `This bot only works in inline mode. \nType @${ctx.me} [your module search term] in any chat to use it. \n\nFor example, to search for all modules containing 'GEA', type \n@${ctx.me} GEA`
    );
});

bot.on("inline_query", async (ctx) => {
    try {
        const query = ctx.inlineQuery.query.trim().toUpperCase();
        if (query.length < 2) return;

        const moduleListResponse = await fetch(
            "https://api.nusmods.com/v2/2022-2023/moduleInfo.json"
        );
        const moduleList: ModuleInformation[] = await moduleListResponse.json();

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

        ctx.answerInlineQuery(trimmedResults, {
            cache_time: 0,
        });
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

    let semestersWithExams = module.semesterData.filter((sem) => sem.examDate);
    if (semestersWithExams.length) {
        msg += semestersWithExams
            .map(
                (sem) =>
                    `Sem ${sem.semester} Exam: ${format(
                        new Date(sem.examDate || new Date()),
                        "dd MMM yyyy h:mm a"
                    )} ${
                        sem.examDuration && `(${sem.examDuration / 60} hrs)\n`
                    }`
            )
            .join("");
        msg += "\n";
    } else {
        msg += `No exams for this module.\n\n`;
    }

    msg += `${module.description ? trim(module.description, 256) : ""}`;

    return msg;
}

function trim(str: string, length: number) {
    return str.length > length ? str.substring(0, length - 3) + "..." : str;
}

bot.launch();

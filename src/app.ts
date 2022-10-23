import { Context, Markup, Telegraf } from "telegraf";
import { Update } from "typegram";
console.log("Running file");

import dotenv from "dotenv";
import fetch from "node-fetch";
import { ModuleCondensed } from "./types/nusmods";
import { InlineQueryResultArticle } from "telegraf/typings/core/types/typegram";
dotenv.config();
const bot: Telegraf<Context<Update>> = new Telegraf(
    process.env.BOT_TOKEN as string
);

bot.start((ctx) => {
    ctx.reply("Hello " + ctx.from.first_name + "!");
});
bot.help((ctx) => {
    ctx.reply("Send /start to receive a greeting");
    ctx.reply("Send /keyboard to receive a message with a keyboard");
    ctx.reply("Send /quit to stop the bot");
});
bot.command("quit", (ctx) => {
    // Explicit usage
    ctx.telegram.leaveChat(ctx.message.chat.id);
    // Context shortcut
    ctx.leaveChat();
});
bot.command("keyboard", (ctx) => {
    ctx.reply(
        "Keyboard",
        Markup.inlineKeyboard([
            Markup.button.callback("First option", "first"),
            Markup.button.callback("Second option", "second"),
        ])
    );
});
bot.on("text", (ctx) => {
    ctx.reply(
        "You choose the " +
            (ctx.message.text === "first" ? "First" : "Second") +
            " Option!"
    );
});

bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query.trim().toUpperCase();
    if (query.length < 2) return;

    const moduleListResponse = await fetch(
        "https://api.nusmods.com/v2/2022-2023/moduleList.json"
    );
    const moduleList: ModuleCondensed[] = await moduleListResponse.json();

    const filteredList = moduleList.filter(
        (module) =>
            module.moduleCode.toUpperCase().includes(query) || module.title.toUpperCase().includes(query)
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

    console.log(sortedList);

    const result:InlineQueryResultArticle[] = sortedList.map((module) => {
        return {
            type: "article",
            id: module.moduleCode,
            title: `${module.moduleCode} - ${module.title}`,
            input_message_content: {
                message_text: `Placeholder text`
            }
        }
    })

    // limit results to 50.
    const trimmedResults = result.slice(0, 50);

    ctx.answerInlineQuery(trimmedResults, {
        cache_time: 0 // to change
    })

});

bot.launch();

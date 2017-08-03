#!/usr/bin/env node

// Descriptors for the CLI parser
const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    { name: 'dataType', alias: 'd', type: DataType, defaultValue: "csv" },
    { name: 'inputData', alias: 'i', type: String, defaultValue: "data.csv" },
    { name: 'template', alias: 't', type: String, defaultValue: "template.mustache" },
    { name: 'htmlOutput', alias: 'o', type: String, defaultValue: "index.html" }
]
let cliArgs = {};
// some error handling for wrong flags
try {
    console.log("CSV2WEB");
    cliArgs = commandLineArgs(optionDefinitions);
} catch (error) {
    console.log("Impossible to run CSV2WEB: " + error);
    process.exit(1);
}

console.log("Execution Info | " + cliArgs.dataType.toUpperCase() + " MODE | I: " + cliArgs.inputData + " T: " + cliArgs.template + " O: " + cliArgs.htmlOutput);

const fs = require('fs');
const Mustache = require('mustache');
const md = require("markdown").markdown;
const csv = require("csvtojson");

var csvData = { info: [] };

function DataType(info) {
    switch (info) {
        case "tsv":
            return "tsv";
            break;
        default:
            return "csv";
            break;
    }
}

function loadTemplate(cb) {
    fs.readFile(cliArgs.template, function (err, templateData) {
        if (err) {
            console.log(err);
            throw err;
        }
        var htmlOutput = Mustache.render(templateData.toString(), csvData);
        console.log("- Template prepared.");
        cb(htmlOutput);
    });
}

function getDelimiter() {
    if (cliArgs.dataType === "tsv") {
        return "\t";
    }
    return ",";
}

function writeHtml(html) {
    fs.writeFile(cliArgs.htmlOutput, html, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("- HTML file '" + cliArgs.htmlOutput + "' is ready.");
        process.exit(0);
    });
}

csv({
    ignoreEmpty: true,
    delimiter: getDelimiter()
}).fromFile(cliArgs.inputData)
    .on('json', function (jsonObj) {
        for (var field in jsonObj) {
            if (field.indexOf("md_") == 0) {
                jsonObj[field] = md.toHTML(jsonObj[field]);
            }
        }
        csvData.info.push(jsonObj);
    })
    .on('done', function (error) {
        if (error) {
            throw error;
        }
        console.log("- Data parsed.");
        loadTemplate(writeHtml);
    });
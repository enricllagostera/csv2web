#!/usr/bin/env node

// Descriptors for the CLI parser
const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    { name: 'help', alias :'h', type: Boolean, defaultValue: false, description: 'Print this usage guide.'},
    { name: 'dataType', alias: 'd', type: DataType, defaultValue: "auto", description: 'Define the format of the data file being processed.', typeLabel: '"csv", "tsv" or "auto"'},
    { name: 'inputData', alias: 'i', type: String, defaultValue: "data.csv", typeLabel:'CSV or TSV file', description: 'Input file with data to be parsed.'},
    { name: 'template', alias: 't', type: String, defaultValue: "template.mustache", typeLabel:'Mustache file', description:'A template for rendering the data into HTML.' },
    { name: 'htmlOutput', alias: 'o', type: String, defaultValue: "index.html", typeLabel:'HTML file', description: '(optional) An HTML file for output.' }
]
let cliArgs = {};

const getUsage = require('command-line-usage');
const sections = [
  {
    header: 'CSV2WEB Usage Guide',
    content: 'Generates an HTML page from CSV or TSV data, according to a Mustache template.'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  }
];
const usage = getUsage(sections);

// some error handling for wrong flags
try {
    
    cliArgs = commandLineArgs(optionDefinitions);
} catch (error) {
    console.log("Impossible to run CSV2WEB: " + error + ". Run 'csv2web --help' for more info.");
    process.exit(1);
}

// only display help and quit
if(cliArgs.help){
    console.log(usage);
    process.exit(0);
}

console.log("Running CSV2WEB...");
console.log("Execution Info | " + cliArgs.dataType.toUpperCase() + " MODE | I: " + cliArgs.inputData + " T: " + cliArgs.template + " O: " + cliArgs.htmlOutput);

const fs = require('fs');
const Mustache = require('mustache');
const md = require("markdown").markdown;
const csv = require("csvtojson");

var csvData = { rows: [] };

function DataType(info) {
    switch (info) {
        case "tsv":
            return "tsv";
            break;
        case "csv":
            return "csv";
            break;
        default:
            return "auto";
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
    let delimiter = ",";
    let extension = "csv";
    switch(cliArgs.dataType) {
        case "auto": 
            let size = cliArgs.inputData.length;
            extension = cliArgs.inputData.substr(size-3, 3);
            break;
        default:
            extension = cliArgs.dataType;
            break;
    }
    if (extension === "tsv") {
        return "\t";
    }
    return delimiter;
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
    })
    .fromFile(cliArgs.inputData)
    .on('json', function (jsonObj) {
        for (var field in jsonObj) {
            if (field.indexOf("md_") == 0) {
                jsonObj[field] = md.toHTML(jsonObj[field]);
            }
        }
        csvData.rows.push(jsonObj);
    })
    .on('done', function (error) {
        if (error) {
            throw error;
        }
        console.log("- Data parsed.");
        loadTemplate(writeHtml);
    });
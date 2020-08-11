"use strict";

const cheerio = require('cheerio');
const fs = require('fs');
const path = require("path");
const html = fs.readFileSync(path.resolve(__dirname, '../lib/html/participation.html'));
const $ = cheerio.load(html);

const majors = ["6-1", "6-2", "6-3", "6-7", "6-14"];
let participationData = {};

const getClassData = (participationData, classNumber) => {
    let participationObj = {};
    majors.forEach(major => {
        let classData = participationData[major][classNumber];
        if (classData) {
            participationObj[major] = classData;
        }
    });
    return participationObj;
};

const scrapeData = async () => {
    majors.forEach(major => {
        parseTable(`a[name*="${major}"]`, major);
    });

    return participationData;
    
};

const elementImmediateText = (element) => {
    return $(element).contents().not($(element).children()).text();
};

const parseTable = function(selector, major) {
    participationData[major] = {};
    const tableBody = $(selector)
        .children('table')
        .first()
        .children('tbody')
        .first();
    tableBody.children('tr').each(function(index, element){
        const number = elementImmediateText($(this).children('td:nth-child(1)').children('a'));
        let participationValues = [];

        for (let i = 2; i < 7; i++) {
            participationValues[i - 2] = $(this).children(`td:nth-child(${i})`).text();
        }

        participationData[major][number] = participationValues;
    });
}

module.exports = {
    scrapeData: scrapeData,
    getClassData: getClassData
};
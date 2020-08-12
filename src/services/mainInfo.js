"use strict";

const cheerio = require('cheerio');
var textversionjs = require("textversionjs");
const fs = require('fs');
const path = require("path");
const html = fs.readFileSync(path.resolve(__dirname, '../lib/html/main.html'));
const $ = cheerio.load(html);

const participationInfo = require('./participationInfo');
const { group } = require('console');

// Found that this is probably easier to hardcode than to scrape. Only did this for 6-2.
const mainGroups = require('../lib/data/mainGroups.json');

const constraintGroups = require('../lib/data/constraintGroups.json');
const { start } = require('repl');

const deptReq = {
    "6-1": {
        "mainGroups": mainGroups["6-1"].filter(obj => {
            return obj.name !== "CIM2";
        }),
        "constraintGroups": constraintGroups["6-1"]
    },
    "6-2": {
        "mainGroups": mainGroups["6-2"].filter(obj => {
            return obj.name !== "CIM2";
        }),
        "constraintGroups": constraintGroups["6-2"]
    },
    "6-3": {
        "mainGroups": mainGroups["6-3"].filter(obj => {
            return obj.name !== "CIM2";
        }),
        "constraintGroups": constraintGroups["6-3"]
    }
};
module.exports = async () => {
    const participationData = await participationInfo.scrapeData();
    let courses = getGroupCourses(participationData);

    courses = getNonGroupCourses(courses, participationData);
    
    

    courses = Object.keys(courses).map((key) => {
        return courses[key];
    });

    return {
        courses: courses,
        deptReq: deptReq
    }
};

const elementImmediateText = (element) => {
    return $(element).contents().not($(element).children()).text();
};

const getNonGroupCourses = (courses, participationData) => {
    let classElements = $('a.annotated-link[target*="_blank"]');

    classElements.each(function(index, element){
        let classNumber = elementImmediateText($(this)).replace(/\*/, "");
        if (!courses[classNumber]) {
            courses[classNumber] = parseClassDiv($(this), null, classNumber, participationData);
        }
        // Special Case
        if (classNumber === "6.UAT" || classNumber === "6.UAR") {
            if (!courses[classNumber].groups.includes("CIM2")) {
                courses[classNumber].groups.push("CIM2")
            }
        }

    });

    return courses;
};

const getGroupCourses = (participationData) => {
    let courses = {};
    let startingElement = $('h3[style="background-color: #45637a; color: white; padding: 5px;"]');
    
    startingElement.nextAll('a').each(function (index, element) {
        let groupName = $(this).text();
        let groupCourses = $(this).nextAll('div').first().children('a');

        groupCourses.each(function (index, element) {
            let courseNumber = elementImmediateText($(this));
            if (courses[courseNumber]) {
                courses[courseNumber].groups.push(groupName);
            } else {
                let courseObj = parseClassDiv($(this), groupName, courseNumber, participationData);
                courses[courseNumber] = courseObj;
            }
        });
    });
    return courses;
}

const parseClassDiv = (course, groupName, courseNumber, participationData) => {
    try {
        let courseName;
        let prereqText;
        let unitsText;
        let unitsArray;

        let courseDescription = elementImmediateText(course
            .children('div')
            .children('p')
            .first()
        );

        let attributes = [];
        course.children('div').children('img').each(function(index, element){
            attributes.push($(this).attr('src').match(/images\/(.+?)\.gif$/)[1]);
        });

        try {
            courseName = elementImmediateText(course
                .children('div')
                .children('b')
                .first())
                .match(/^.+? (.*?)$/)[1];
            prereqText = elementImmediateText(course.children('div').first())
                .match(/^.*?: (.*?)Units:/)[1];
            unitsText = elementImmediateText(course.children('div').first())
                .match(/Units: (.*?)$/)[1];
            unitsArray = [];
                if (unitsText.match(/^[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}$/)) {
                    unitsArray[0] = unitsText[0];
                    unitsArray[1] = unitsText[2];
                    unitsArray[2] = unitsText[4];
                } else {
                    // No units displayed for class
                    unitsArray = ["", "", ""];
                }
        }
        catch (error) {
            if (error instanceof TypeError) {
                console.log("No Class Info Provided with Class: " + elementImmediateText(course));
                console.log("-----------------------------------");
            } else {
                throw error;
            }
        }

        let lecturers =  course
            .children('div')
            .children('div')
            .first()
            .html()
        if (lecturers) {
            lecturers = textversionjs(lecturers);
            lecturers = lecturers.replace(/&#xA0;/gm, "\xa0");
            lecturers = lecturers.replace(/&gt;/gm, ">");
            lecturers = lecturers.replace(/&lt;/gm, "<");
            lecturers = lecturers.replace(/&apos;/gm, "'");
        }
        console.log(lecturers)
        
        let participation = participationInfo.getClassData(participationData, courseNumber);

        let groups = [];
        if (groupName) { groups.push(groupName) };

        return {
            name: courseName,
            number: courseNumber,
            description: courseDescription,
            groups: groups,
            prereqs: prereqText,
            units: unitsArray,
            lecturers: lecturers,
            ocw: `https://ocw.mit.edu/search/ocwsearch.htm?q=${courseNumber}`,
            participation: participation,
            registrar: `http://student.mit.edu/catalog/search.cgi?search=${courseNumber}`,
            attributes: attributes
        };
    } catch (error) {
        console.log("-----------------------------------");
        console.log("Error encountered when parsing class: " + elementImmediateText(course));
        console.log(error);
        console.log("-----------------------------------");
    }
    
}
"use strict";

const fs = require("fs");

const mainInfo = require('./mainInfo');
const updateHtml = require('./updateHTML');

module.exports = async () => {
  // await updateHtml();
  let data = await mainInfo();

  await fs.writeFile('classData.json', JSON.stringify(data), (err) => {
      if (err) throw err;
    });
  console.log("DONE! Output is found in classData.json");
}


/*
* Demo of gerrit-label, add labels as per provided configuration, and print to console.
* See config-demo.json for configuration.
*/

let chalk = require("chalk");
let getChanges = require("./gerrit-label");
let config = require("./config-demo.json");

/**
 * Print one change to the console
 * @param {object} change the change
 */
function processChange(change) {
  console.log(chalk.blue(change.project) + " - " + chalk.green(change.subject) +
    " [" + chalk.yellow(change.labels.join(", ")) + "]");
}

getChanges(config, processChange);


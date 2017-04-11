var inputData = require('./src/input-data'),
    inputFile = require('./src/input-file'),
    pnow = require('performance-now'),
    textreader = require('./src/text-reader'),
    timer = require('cumulative-timer'),
    dbWriter = require('./src/db'),
    exec = require('child_process').exec,
    fs = require("fs");

const inputFilePath = "c:/Temp/epanet-input.inp";
const outputReport = "c:/Temp/epanet-result.txt";
const outputBinary = "c:/Temp/epanet-result.bin";
let records = {};

function run() {
    const locality = process.argv[2] || 'zawcge--';
    console.log('Starting EPANet simulation for locality: ', locality);
    timer.start('total');
    const t1 = pnow();
    timer.start('inputData');
    // Build input file
    inputData.fetch(locality)
        .then(inputRecords => {
            timer.stop('inputData');
            records = inputRecords;
            timer.start('inputFile');
            return inputFile.build(inputRecords);
        }).then(inputFileContent => {
            console.log('inputfile ready...');
            return new Promise(function (resolve, reject) {
                fs.writeFile(inputFilePath, inputFileContent, function (error) {
                    timer.stop('inputFile');
                    if (error) reject(error);
                    else resolve(inputFileContent);
                });
            });
        }).then(() => {
            // Execute command line binary
            timer.start('EPANet');
            return new Promise((resolve, reject) => {
                exec(`c:/src/cpp/epanet-dev/build/bin/Release/run-epanet3.exe ${inputFilePath} ${outputReport} ${outputBinary}`,
                    function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log('stdout: ' + stdout);
                            console.log('stdError: ', stderr);
                            reject(error);
                        }
                        timer.stop('EPANet');
                        resolve(stdout);
                    });
            });
        }).then(() => {
            timer.start('resultParsing');
            console.log('Reading results from text file');
            return textreader.read(outputReport, records)
        }).then((resultRecords) => {
            timer.stop('resultParsing');
            timer.start('insertDB');
            console.log('Writing results to DB');
            return dbWriter.write(resultRecords, locality)
        }).then(() => {
            const t2 = pnow();
            timer.stop('insertDB');
            timer.stop('total');
            timer.log();
            console.log('Simulation completed in', ((t2 - t1) / 1000).toFixed(3), 'seconds');
            process.exit();
        }).catch((error) => {
            console.error('Something went very wrong: ', error);
            process.exit();
        })

}

run();
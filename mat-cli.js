#!/usr/bin/env node

const program = require('commander');

const compiler = require('./scripts/compiler');

program
    .version('1.0.1')
    .description('MAT CLI - helper commands to make my life easier.')
    .option('-A, --deployAngular', 'deploy to https://app.gomat.co')
    .option('-C, --compile [option]', 'compile code to site')
    .option('-N, --deployNode', 'deploy to https://node.gomat.co')
    .option('-P, --deployPhp', 'deploy to https://gomat.co')
    .option('-T, --deployAll', 'deploy to https://node.gomat.co & https://mat.co && https://app.gomat.co')
    .option('-X, --compileAdmin', 'compile admin.sayshannon.com')
    .option('-S, --compileSatee', 'compile comesate.com')

    .parse(process.argv);

if (program.compile) {
    const compilerResponse = new Promise((resolve, reject) => {
        const response = compiler.compileDev();

        resolve(response);
    });

    compilerResponse.then((response) => {
        console.info('finished and the code is', response);
        
        process.exit(200);
    });
} else if (program.compileAdmin) {
    const compilerResponse = new Promise((resolve, reject) => {
        const response = compiler.compileAdminSayShannon();

        resolve(response);
    });

    compilerResponse.then((response) => {
        console.info('finished and the code is', response);

        process.exit(200);
    });
} else if (program.compileSatee) {
    const compilerResponse = new Promise((resolve, reject) => {
        const response = compiler.compileSatee();

        resolve(response);
    });

    compilerResponse.then((response) => {
        console.info('finished compiling satee site... =>', response);

        process.exit(200);
    });
} else if (program.verifyDocuments) {

} else {
    process.exit(200);
}
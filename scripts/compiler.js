 var cmd = require('node-cmd');

 const compileDev = async () => {
    const moveToDevFolder = await new Promise((resolve, reject) => {
        cmd.get(`
           cd /home/vagrant/mat-admin-panel/dev/
           ng build --prod
           cd ../
           rm -R site/
           cp -avr ./dev/dist/fuse/ ./site
           cp -avr ./noframework/* ./site
        `, (error, data, stderror) => {
            if (error) {
                reject(false);
            }
            /**
             *     rm -R /home/vagrant/mat-php/public/site/
                   cp -avr /home/vagrant/mat-admin-panel/site/ /home/vagrant/mat-php/public/site
             */

            console.info({
                '/home/vagrant/mat-admin-panel/dev': data,
                error,
                stderror,
            });

            resolve(true);
        });
    });

    return moveToDevFolder;
};

 const compileAdminSayShannon = async () => {
    const result = await new Promise((resolve, reject) => {
        cmd.get(`
           cd /home/vagrant/admin-sayshannon/dev
           ng build --prod
           cd ../
           rm -R ./public/
           cp -avr ./dev/dist/fuse/ ./public
        `, (error, data, stderror) => {
            if (error) {
                reject(false);
            }

            console.info({
                '/home/vagrant/admin-sayshannon/dev': data,
                error,
                stderror,
            });

            resolve(true);
        });
    });

    return result;
 };

 const compileSatee = async () => {
    const moveToDevFolder = await new Promise((resolve, reject) => {
        cmd.get(`
           cd /home/vagrant/satee/dev/
           ng build --prod
           cd ../
           rm -R site/
           cp -avr ./dev/dist/satee/ ./site
        `, (error, data, stderror) => {
            if (error) {
                reject(false);
            }
            /**
             *     rm -R /home/vagrant/mat-php/public/site/
                   cp -avr /home/vagrant/mat-admin-panel/site/ /home/vagrant/mat-php/public/site
             */

            console.info({
                '/home/vagrant/satee/dev/': data,
                error,
                stderror,
            });

            resolve(true);
        });
    });

    return moveToDevFolder;
};

 module.exports = {
     compileDev,
     compileAdminSayShannon,
     compileSatee,
 };
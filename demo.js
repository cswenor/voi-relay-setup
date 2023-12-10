const read = require('read');

read({ prompt: 'Test Prompt: ', silent: true, replace: '*' }, (err, input) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Input Received:', input);
    }
});
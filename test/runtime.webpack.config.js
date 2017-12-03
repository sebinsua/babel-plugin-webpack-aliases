var path = require('path')

module.exports = {
    resolve: {
        alias: {
            'my-absolute-test-lib': path.join(__dirname, 'assets/le-test-lib'),
            'my-relative-test-lib': './assets/le-test-lib/',
            'my-root-folder-lib': './fixtures/',
            'alias-of-a-dependency': 'find-up'
        }
    },
    externals: {
        'special-outside-messaging-one': [
            'namespace',
            'special-outside-messaging-1'
        ],
        'special-outside-messaging-two': [
            'namespace',
            'special-outside-messaging-2'
        ]
    }
}

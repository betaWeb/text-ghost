const {prependPolyfills} = require('./src/Utils')
require('./src/style.css')

prependPolyfills()
require('./src/index')
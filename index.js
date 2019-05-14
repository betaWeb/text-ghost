const {prependPolyfills} = require('./src/Utils')
require('./src/style.scss')

prependPolyfills()
require('./src/index')
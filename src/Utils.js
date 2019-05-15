const Utils = {

    get isBrowserSide() {
        return typeof window !== 'undefined' && typeof document !== 'undefined'
    },

    get isServerSide() {
        return typeof module !== 'undefined' &&
            typeof module.exports !== 'undefined' &&
            typeof global !== 'undefined'
    },

    debounce(func, wait, immediate) {
        let timeout
        return function () {
            let context = this, args = arguments
            let later = function () {
                timeout = null
                if (!immediate) func.apply(context, args)
            }
            let callNow = immediate && !timeout
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
            if (callNow) func.apply(context, args)
        }
    },

    /**
     * Prepend babel polyfill file
     */
    prependPolyfills() {
        if ((Utils.isServerSide && !global._babelPolyfill) || (Utils.isBrowserSide && !window._babelPolyfill))
            require('@babel/polyfill')
    }

}

module.exports = Utils
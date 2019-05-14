const Utils = {

    get isBrowserSide() {
        return typeof window !== 'undefined' && typeof document !== 'undefined'
    },

    get isServerSide() {
        return typeof module !== 'undefined' &&
            typeof module.exports !== 'undefined' &&
            typeof global !== 'undefined'
    },

    debounce(callback, delay) {
        let timer
        return () => {
            let args = arguments
            let context = this
            clearTimeout(timer)
            timer = setTimeout(() =>callback.apply(context, args), delay)
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
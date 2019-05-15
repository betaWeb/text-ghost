const UndefinedElementException = require('./UndefinedElementException')
const {isServerSide, isBrowserSide, debounce} = require('./Utils')

const DEFAULT_OPTIONS = {
    mask_default_value: '',
    case_sensitive: false,
    min_length: 2,
    enable_loader: true,
    cls: {
        container: 'tg__container',
        input: 'tg__input',
        mask: 'tg__mask',
        loader: 'tg__loader'
    },
    beforePredicate() {},
    onPredicate(predicate) {},
    onError(err) {
        console.error(err)
    },
    predicateFn: null,
}

class TextGhost {

    /**
     *
     * @param {HTMLInputElement|String} element
     * @param {Array|null} list
     * @param {Object|null} options
     */
    constructor(element, list = [], options = {}) {
        if (!element) throw new UndefinedElementException('[Err] TextGhost.constructor')

        this._element = element.constructor === HTMLInputElement
            ? element
            : document.querySelector(element)

        this._list = list || []

        this._options = {
            ...DEFAULT_OPTIONS,
            ...options
        }

        this._buildHtml()
        this._bindContextOnEvents()
    }

    /**
     * @return {HTMLElement}
     */
    get element() {
        return this._element
    }

    /**
     * @return {Array}
     */
    get list() {
        return this._list
    }

    /**
     * @param {Array} list
     * @return {TextGhost}
     */
    set list(list) {
        this._list = list
        return this
    }

    /**
     * Build TextGhost HTML template
     *
     * @private
     */
    _buildHtml() {
        const clonedElement = this._element.cloneNode()
        this._container = document.createElement('div')
        this._mask = document.createElement('input')

        if (clonedElement.classList.value.length)
            this._mask.classList.add(clonedElement.classList.value)

        this._mask.classList.add(this._options.cls.mask)
        this._mask.setAttribute('readonly', '')
        this._mask.setAttribute('tabindex', '-1')

        if (this._options.mask_default_value.length)
            this._setMaskValue()

        clonedElement.removeAttribute('placeholder')
        clonedElement.classList.add(this._options.cls.input)
        clonedElement.setAttribute('tabindex', '-1')

        clonedElement.addEventListener('keydown', this._onTabKey.bind(this))
        clonedElement.addEventListener('keyup', debounce(this._onInput.bind(this), 500))

        this._container.classList.add(this._options.cls.container)
        this._container.appendChild(clonedElement)
        this._container.appendChild(this._mask)

        this._buildLoader()

        this._element.parentNode.replaceChild(this._container, this._element)
        this._element = clonedElement
    }

    /**
     * Build loader HTML element
     *
     * @private
     */
    _buildLoader() {
        if (this._options.enable_loader) {
            this._loader = document.createElement('div')
            this._loader.classList.add(this._options.cls.loader)
            this._loader.style.display = 'none'
            this._container.appendChild(this._loader)
        }
    }

    /**
     * @param {KeyboardEvent} e
     * @private
     */
    _onTabKey(e) {
        if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()
            if (this._element.value !== this._mask.value) {
                this._element.value = this._mask.value
                this._setMaskValue()
            }
        }
    }

    /**
     * @param {KeyboardEvent} e
     * @private
     */
    _onInput(e) {
        if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()
        } else {
            if (!(e.ctrlKey && e.key === 'Backspace') && this._element.value.length >= this._options.min_length) {
                this._options.enable_loader && (this._loader.style.display = 'block')

                let promise = this._options.beforePredicate(this._element.value)

                if (!promise || promise.constructor !== Promise)
                    promise = Promise.resolve()

                promise.catch(this._options.onError)
                    .then(() => this._setMaskValue(this._findPredicate()))
                    .finally(() => this._options.enable_loader && (this._loader.style.display = 'none'))
            } else
                this._setMaskValue()
        }
    }

    /**
     * Set mask input value
     *
     * @param {String} value
     * @private
     */
    _setMaskValue(value = this._options.mask_default_value) {
        this._mask.value = value
    }

    /**
     * Find predicate in list depending of input element value
     *
     * @return {String}
     * @private
     */
    _findPredicate() {
        if (this._options.predicateFn && this._options.predicateFn.constructor === Function)
            return this._options.predicateFn(this._element.value, this._list)

        let predicate = this._list.find(item => {
            let value = this._element.value
            if (!this._options.case_sensitive) {
                value = value.toLowerCase()
                item = item.toLowerCase()
            }
            return item.startsWith(value)
        }) || ''

        if (this._options.case_sensitive)
            return predicate

        predicate = predicate.toLowerCase()

        this._options.onPredicate(predicate)

        return predicate
    }

    _bindContextOnEvents() {
        ['beforePredicate', 'onPredicate', 'predicateFn', 'onError'].forEach(fn => {
            if (this._options[fn] && this._options[fn].constructor === Function)
                this._options[fn].bind(this)
        })
    }

}

if (isServerSide) module.exports = TextGhost
if (isBrowserSide) !window.hasOwnProperty('TextGhost') && (window.TextGhost = TextGhost)

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
    beforePredicate() {
    },
    onPredicate(predicate) {
    },
    onError(err) {
        console.error(err)
    },
    predicateFn: null,
}

class TextGhost {

    /**
     *
     * @param {HTMLInputElement|HTMLTextAreaElement|HTMLDivElement|String} selector
     * @param {Array|null} list
     * @param {Object|null} options
     */
    constructor(selector, list = [], options = {}) {
        if (!selector) throw new Error('[Err] TextGhost.constructor - selector is not defined')

        this._element = selector
        this._list = list || []
        this._options = {
            ...DEFAULT_OPTIONS,
            ...options
        }

        this._setSelector()
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
     * Returns element value
     *
     * @return {String}
     */
    getValue() {
        return this._isContentEditableElement()
            ? this._element.innerText
            : this._element.value
    }

    _setSelector() {
        if (this._element.constructor === String)
            this._element = document.querySelector(this._element)

        if (this._element.constructor !== HTMLInputElement &&
            this._element.constructor !== HTMLTextAreaElement &&
            !this._isContentEditableElement()
        )
            this._element.setAttribute('contenteditable', '')
    }

    /**
     * Build TextGhost HTML template
     *
     * @private
     */
    _buildHtml() {
        const clonedElement = this._element.cloneNode()
        this._container = document.createElement('div')

        if (this._options.mask_default_value.length)
            this._setMaskValue()

        clonedElement.removeAttribute('placeholder')
        clonedElement.classList.add(this._options.cls.input)
        clonedElement.setAttribute('tabindex', '-1')

        clonedElement.addEventListener('keydown', this._onTabKey.bind(this))
        clonedElement.addEventListener('keyup', debounce(this._onInput.bind(this), 500))

        this._container.classList.add(this._options.cls.container)
        this._container.appendChild(clonedElement)

        this._buildMask()
        this._buildLoader()

        this._element.parentNode.replaceChild(this._container, this._element)
        this._element = clonedElement
    }

    _buildMask() {
        this._mask = document.createElement('div')
        this._mask.setAttribute('contenteditable', '')

        if (this._element.classList.value.length)
            this._mask.classList.add(this._element.classList.value)

        this._mask.classList.add(this._options.cls.mask)
        this._mask.setAttribute('readonly', '')
        this._mask.setAttribute('tabindex', '-1')
        this._container.appendChild(this._mask)
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
            const maskValue = this._mask.innerText
            if (maskValue.length && this.getValue() !== maskValue) {
                if (this._isContentEditableElement())
                    this._element.innerText = maskValue
                else
                    this._element.value = maskValue
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
            if (!(e.ctrlKey && e.key === 'Backspace') && this.getValue().length >= this._options.min_length) {
                this._options.enable_loader && (this._loader.style.display = 'block')

                let promise = this._options.beforePredicate(this.getValue())

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
        this._mask.innerText = value
    }

    /**
     * Find predicate in list depending of input element value
     *
     * @return {String}
     * @private
     */
    _findPredicate() {
        const value = this.getValue()
        if (this._options.predicateFn && this._options.predicateFn.constructor === Function)
            return this._options.predicateFn(value, this._list)

        let predicate = this._list.find(item => {
            const predict = item.startsWith(value)
            if (!this._options.case_sensitive)
                return predict || item.toLowerCase().startsWith(value.toLowerCase())
            return predict
        }) || ''

        if (this._options.case_sensitive) {
            this._options.onPredicate(predicate)
            return predicate
        }

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

    _isContentEditableElement() {
        return this._element && this._element.isContentEditable
    }

}

if (isServerSide) module.exports = TextGhost
if (isBrowserSide) !window.hasOwnProperty('TextGhost') && (window.TextGhost = TextGhost)

const {isServerSide, isBrowserSide, debounce} = require('./Utils')

const DEFAULT_OPTIONS = {
    mask_default_value: '',
    case_sensitive: false,
    min_length: 2,
    cls: {
        container: 'tg__container',
        input: 'tg__input',
        mask: 'tg__mask'
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
     * @param {HTMLInputElement|HTMLTextAreaElement|String} selector
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

    /**
     * @private
     */
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
        this._container = document.createElement('div')
        this._element.parentNode.appendChild(this._container)

        if (this._options.mask_default_value.length)
            this._setMaskValue()

        this._container.classList.add(this._options.cls.container)

        this._buildElement()
        this._buildMask()
    }

    /**
     * Build TextGhost input element
     *
     * @private
     */
    _buildElement() {
        this._element.removeAttribute('placeholder')
        this._element.classList.add(this._options.cls.input)
        this._element.setAttribute('tabindex', '-1')

        this._element.addEventListener('keydown', this._onTabKey.bind(this))
        this._element.addEventListener('keyup', debounce(this._onInput.bind(this), 500))
        this._container.appendChild(this._element)
    }

    /**
     * Build TextGhost mask HTML template
     *
     * @private
     */
    _buildMask() {
        this._mask = document.createElement('div')
        this._mask.setAttribute('contenteditable', '')

        if (this._element.classList.value.length)
            this._mask.classList.add.apply(
                this._mask.classList,
                this._element.classList.value.split(' ')
            )

        this._mask.classList.add(this._options.cls.mask)
        this._mask.setAttribute('readonly', '')
        this._mask.setAttribute('tabindex', '-1')
        this._container.appendChild(this._mask)
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
                let promise = this._options.beforePredicate(this.getValue())

                if (!promise || promise.constructor !== Promise)
                    promise = Promise.resolve()

                promise.catch(this._options.onError)
                    .then(() => this._setMaskValue(this._findPredicate()))
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

    /**
     * @private
     */
    _bindContextOnEvents() {
        ['beforePredicate', 'onPredicate', 'predicateFn', 'onError'].forEach(fn => {
            if (this._options[fn] && this._options[fn].constructor === Function)
                this._options[fn].bind(this)
        })
    }

    /**
     * @return {boolean}
     * @private
     */
    _isContentEditableElement() {
        return this._element && this._element.isContentEditable
    }

}

if (isServerSide) module.exports = TextGhost
if (isBrowserSide) !window.hasOwnProperty('TextGhost') && (window.TextGhost = TextGhost)

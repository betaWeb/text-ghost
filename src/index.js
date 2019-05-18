const Mask = require('./Mask')
const {isServerSide, isBrowserSide, debounce} = require('./Utils')

const DEFAULT_OPTIONS = {
    mask_default_value: '',
    case_sensitive: false,
    min_length: 2,
    search_policy: 'starts_with',
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
     * Get search policies
     *
     * @return {{STARTS_WITH: string, ENDS_WITH: string, CONTAINS: string}}
     */
    static get policies() {
        return {
            STARTS_WITH: 'starts_with',
            ENDS_WITH: 'ends_with',
            CONTAINS: 'contains',
        }
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
        this._container.classList.add(this._options.cls.container)

        this._buildElement()

        const mask_css_classes = [this._options.cls.mask, this._element.classList.value]
        if (this._options.search_policy !== TextGhost.policies.STARTS_WITH)
            mask_css_classes.push('to-right')

        this._mask = new Mask(
            this._options.mask_default_value,
            mask_css_classes.join(' ')
        )
        this._mask.appendTo(this._container)
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
     * @param {KeyboardEvent} e
     * @private
     */
    _onTabKey(e) {
        if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()
            const maskValue = this._mask.getValue()
            if (maskValue.length && this.getValue() !== maskValue) {
                if (this._isContentEditableElement())
                    this._element.innerText = maskValue
                else
                    this._element.value = maskValue
                this._mask.setValue()
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
                    .then(() => {
                        const predicate = this._findPredicate()
                        this._options.onPredicate(predicate)
                        this._mask.setValue(predicate)
                    })
            } else
                this._mask.setValue()
        }
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
            let predict = null
            switch (this._options.search_policy) {
                case TextGhost.policies.CONTAINS:
                    predict = item.includes(value)
                    if (!this._options.case_sensitive)
                        return predict || item.toLowerCase().includes(value.toLowerCase())
                    return predict

                case TextGhost.policies.ENDS_WITH:
                    predict = item.endsWith(value)
                    if (!this._options.case_sensitive)
                        return predict || item.toLowerCase().endsWith(value.toLowerCase())
                    return predict

                default:
                case TextGhost.policies.STARTS_WITH:
                    predict = item.startsWith(value)
                    if (!this._options.case_sensitive)
                        return predict || item.toLowerCase().startsWith(value.toLowerCase())
                    return predict
            }
        }) || ''

        if (this._options.case_sensitive)
            return predicate

        predicate = predicate.toLowerCase()

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

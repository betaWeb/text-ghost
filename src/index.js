const UndefinedElementException = require('./UndefinedElementException')
const {isServerSide, isBrowserSide, debounce} = require('./Utils')

const DEFAULT_OPTIONS = {
    mask_default_value: '',
    case_sensitive: false,
    min_length: 2,
    cls: {
        container: 'tg__container',
        input: 'tg__input',
        mask: 'tg__mask',
        loader: 'tg__loader',
        error_message: 'tg__error_message'
    },
    beforeInput() {
        return Promise.resolve()
    }
}

class TextGhost {

    constructor(element, list, options = {}) {
        if (!element) throw new UndefinedElementException('[Err] TextGhost.constructor')

        this._element = element.constructor === HTMLElement
            ? element
            : document.querySelector(element)

        this._list = list

        this._options = {
            ...DEFAULT_OPTIONS,
            ...options
        }

        this._buildHtml()
    }

    /**
     * @return {HTMLElement}
     */
    get element() {
        return this._element
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
        const input = this._element.cloneNode()
        const container = document.createElement('div')
        this._mask = document.createElement('input')
        this._loader = document.createElement('div')
        this._error = document.createElement('div')
        container.classList.add(this._options.cls.container)

        if (input.classList.value.length)
            this._mask.classList.add(input.classList.value)

        this._mask.classList.add(this._options.cls.mask)
        this._mask.setAttribute('readonly', '')
        this._mask.setAttribute('tabindex', '-1')

        if (this._options.mask_default_value.length)
            this._setMaskValue()

        input.removeAttribute('placeholder')
        input.classList.add(this._options.cls.input)
        input.setAttribute('tabindex', '-1')

        input.addEventListener('keydown', this._onTabKey.bind(this))
        input.addEventListener('keyup', debounce(this._onInput.bind(this), 500).bind(this))

        this._loader.classList.add(this._options.cls.loader)
        this._error.classList.add(this._options.cls.error_message)

        this._loader.style.display = 'none'
        this._error.style.display = 'none'

        container.appendChild(input)
        container.appendChild(this._mask)
        container.appendChild(this._loader)
        container.appendChild(this._error)
        this._element.parentNode.replaceChild(container, this._element)
        this._element = input
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
        this._error.title = ''
        this._error.style.display = 'none'

        if (e.key !== 'Tab') {
            if (!(e.ctrlKey && e.key === 'Backspace') && this._element.value.length >= this._options.min_length) {
                this._loader.style.display = 'block'
                this._options.beforeInput()
                    .catch(err => {
                        this._error.title = err
                        this._error.style.display = ''
                    })
                    .then(() => {
                        this._setMaskValue(this._findPredicate())
                    })
                    .finally(() => this._loader.style.display = 'none')
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
        let predicate = this._list.find(item => {
            let value = this._element.value
            if (!this._options.case_sensitive) {
                value = value.toLowerCase()
                item = item.toLowerCase()
            }
            return item.startsWith(value)
        }) || ''

        if (this._options.case_sensitive) {
            return predicate
        }

        return predicate.toLowerCase()
    }

}

if (isServerSide) module.exports = TextGhost
if (isBrowserSide) !window.hasOwnProperty('TextGhost') && (window.TextGhost = TextGhost)

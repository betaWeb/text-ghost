const Mask = require('./Mask')
const Predicate = require('./Predicate')
const {isServerSide, isBrowserSide, debounce} = require('./Utils')

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
            ...TextGhost.DEFAULT_OPTIONS,
            ...options
        }
        this._lastPredicate = null

        this._setSelector()
        this._buildHtml()
        this._bindContextOnEvents()
    }

    static get DEFAULT_OPTIONS() {
        return {
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
     * Returns last predicate class instance
     *
     * @return {Predicate|null}
     */
    getLastPredicate() {
        return this._lastPredicate
    }

    /**
     * Returns element value
     *
     * @return {String}
     */
    getValue() {
        return this._element.innerText
    }

    /**
     * @private
     */
    _setSelector() {
        if (this._element.constructor === String)
            this._element = document.querySelector(this._element)

        if (this._element.constructor !== HTMLInputElement &&
            this._element.constructor !== HTMLTextAreaElement &&
            !this._element.isContentEditable
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
        if (this._options.search_policy !== Predicate.POLICIES.STARTS_WITH)
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
        if (this._element.constructor === HTMLInputElement || this._element.constructor === HTMLTextAreaElement) {
            this._originalElement = this._element

            this._originalElement.constructor === HTMLInputElement && (this._originalElement.type = 'hidden')
            this._originalElement.constructor === HTMLTextAreaElement && (this._originalElement.style.display = 'none')

            this._element = document.createElement('div')
            this._element.setAttribute('contenteditable', '')
            this._element.classList.add.apply(this._element.classList, this._originalElement.classList.value.split(' '))
        }

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
        if ( e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
        }

        if (e.key === 'Tab') {
            e.preventDefault()
            e.stopPropagation()

            const maskValue = this._mask.getValue()
            if (maskValue.length && this.getValue() !== maskValue) {
                this._element.innerText = maskValue
                this._mask.setValue()
                this._setCursorPosition()
                this._lastPredicate = null
                this._setOriginalElementValue()
            }
        } else if (this._lastPredicate && e.altKey && e.key === 'ArrowLeft')
            this._mask.setValue(this._lastPredicate.prev())
        else if (this._lastPredicate && e.altKey && e.key === 'ArrowRight')
            this._mask.setValue(this._lastPredicate.next())
    }

    /**
     * @param {KeyboardEvent} e
     * @private
     */
    _onInput(e) {
        const altKey = e.altKey || e.key === 'Alt'
        const isPredicateSearchKeys = altKey || (altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'));

        this._setOriginalElementValue()

        if (e.key === 'Tab' || e.key === 'Enter' || isPredicateSearchKeys) {
            e.preventDefault()
            e.stopPropagation()
        } else {
            if (!isPredicateSearchKeys) {
                if (!(e.ctrlKey && e.key === 'Backspace') && this.getValue().length >= this._options.min_length) {
                    let promise = this._options.beforePredicate(this.getValue())

                    if (!promise || promise.constructor !== Promise)
                        promise = Promise.resolve()

                    promise.catch(this._options.onError)
                        .then(() => {
                            this._findPredicate()
                            this._options.onPredicate(this._lastPredicate)
                            this._mask.setValue(this._lastPredicate.current())
                        })
                } else
                    this._mask.setValue()
            }
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

        this._lastPredicate = new Predicate(this._list, {
            policy: this._options.search_policy,
            case_sensitive: this._options.case_sensitive
        })

        this._lastPredicate.find(value)
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
     * Move cursor to the end of input
     *
     * @private
     */
    _setCursorPosition() {
        let sel, pos = this._element.innerText.length
        if ('selection' in document) {
            sel = document.selection.createRange();
            sel.moveStart('character', pos);
            sel.select();
        } else {
            sel = window.getSelection();
            sel.collapse(this._element.lastChild, pos);
        }

        this._element.focus()
    }

    _setOriginalElementValue() {
        if (this._originalElement.isContentEditable)
            this._originalElement.innerText = this.getValue()
        else
            this._originalElement.value = this.getValue()
    }

}

if (isServerSide) module.exports = TextGhost
if (isBrowserSide) !window.hasOwnProperty('TextGhost') && (window.TextGhost = TextGhost)

class Mask {

    constructor(defaultValue, css_classes) {
        this._defaultValue = defaultValue
        this._element = null

        this._buildHTML(css_classes)
        this.setValue()
    }

    /**
     * Get mask HTML element
     *
     * @return {HTMLDivElement}
     */
    getElement() {
        return this._element
    }

    /**
     * Get mask value
     *
     * @return {String}
     */
    getValue() {
        return this._element.textContent
    }

    /**
     * Set mask value
     *
     * @param {String|null} value
     * @return {Mask}
     */
    setValue(value = this._defaultValue) {
        this._element.textContent = value
        return this
    }

    /**
     * Append mask element to a container
     *
     * @param {HTMLElement} container
     */
    appendTo(container) {
        container.appendChild(this._element)
    }

    /**
     * Build mask element
     *
     * @param {String} css_classes
     * @private
     */
    _buildHTML(css_classes) {
        this._element = document.createElement('div')
        this._element.setAttribute('contenteditable', '')
        this._element.setAttribute('readonly', '')
        this._element.setAttribute('tabindex', '-1')

        if (css_classes && css_classes.length)
            this._element.classList.add.apply(
                this._element.classList,
                css_classes.trim().split(' ')
            )
    }

}

module.exports = Mask

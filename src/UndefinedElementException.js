class UndefinedElementException extends Error {

    constructor(prefix = null) {
        super()
        this.message = `element is not defined !`
        if (prefix) this.message = `${prefix} - ${this.message}`
    }

}
module.exports = UndefinedElementException
class Predicate {

    /**
     * @param {Array} list
     * @param {Object} options
     */
    constructor(list, options = {}) {
        this._list = list
        this._options = {
            ...Predicate.DEFAULT_OPTIONS,
            ...options
        }

        this._predicates = []
        this._index = 0
    }

    static get DEFAULT_OPTIONS() {
        return {
            policy: Predicate.POLICIES.STARTS_WITH,
            case_sensitive: false
        }
    }

    static get POLICIES() {
        return {
            STARTS_WITH: 'starts_with',
            ENDS_WITH: 'ends_with',
            CONTAINS: 'contains',
        }
    }

    /**
     * @return {Array}
     */
    getPredicates() {
        return this._predicates
    }

    /**
     * @return {number}
     */
    getCurrentIndex() {
        return this._index
    }

    /**
     * Find predicates on list
     *
     * @param {String} value
     * @return {String}
     */
    find(value) {
        this._predicates = this._list.filter(item => {
            switch (this._options.policy) {
                case Predicate.POLICIES.CONTAINS:
                    return this._findContains(item, value)

                case Predicate.POLICIES.ENDS_WITH:
                    return this._findEndsWith(item, value)

                default:
                case Predicate.POLICIES.STARTS_WITH:
                    return this._findStartsWith(item, value)
            }
        }) || []

        if (!this._isCaseSensitive())
            this._predicates = this._predicates.map(predicate => predicate.toLowerCase())

        return this.current()
    }

    /**
     * Get current predicate if exists
     *
     * @return {String}
     */
    current() {
        return this._predicates[this._index] || ''
    }

    /**
     * Get prev predicate if exists
     *
     * @return {String}
     */
    prev() {
        if (this._index - 1 < 0)
            this._index = this._predicates.length - 1
        else
            this._index -= 1

        return this.current()
    }

    /**
     * Get next predicate if exists
     *
     * @return {String}
     */
    next() {
        if (this._index + 1 > this._predicates.length - 1)
            this._index = 0
        else
            this._index += 1

        return this.current()
    }

    /**
     * Find predicates on list that starts with value
     *
     * @param {String} item
     * @param {String} value
     * @return {Boolean}
     * @private
     */
    _findStartsWith(item, value) {
        return this._find('startsWith', item, value)
    }

    /**
     * Find predicates on list that ends value
     *
     * @param {String} item
     * @param {String} value
     * @return {Boolean}
     * @private
     */
    _findEndsWith(item, value) {
        return this._find('endsWith', item, value)
    }

    /**
     * Find predicates on list that contains value
     *
     * @param {String} item
     * @param {String} value
     * @return {Boolean}
     * @private
     */
    _findContains(item, value) {
        return this._find('includes', item, value)
    }

    /**
     * Find predicates on list
     *
     * @param {String} fn
     * @param {String} item
     * @param {String} value
     * @return {Boolean}
     * @private
     */
    _find(fn, item, value) {
        const predict = item[fn].call(item, value)
        if (!this._isCaseSensitive()) {
            item = item.toLowerCase()
            return predict || item[fn].call(item, value.toLowerCase())
        }
        return predict
    }

    /**
     * @return {boolean}
     * @private
     */
    _isCaseSensitive() {
        return Boolean(this._options.case_sensitive === true)
    }

}

module.exports = Predicate
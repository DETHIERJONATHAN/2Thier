"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptBlockStructure = void 0;
// Helper pour adapter la structure de données du block pour le frontend
var adaptBlockStructure = function (block) {
    return __assign(__assign({}, block), { sections: block.Section.map(function (section) { return (__assign(__assign({}, section), { fields: section.Field.map(function (field) { return (__assign(__assign({}, field), { options: field.FieldOption })); }) })); }) });
};
exports.adaptBlockStructure = adaptBlockStructure;

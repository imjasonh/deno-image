import { bgGreen, bgRed, bold, gray, green, red, stripColor, white, } from "../fmt/colors.ts";
import { diff, diffstr, DiffType } from "./_diff.ts";
const CAN_NOT_DISPLAY = "[Cannot display]";
export class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = "AssertionError";
    }
}
export function _format(v) {
    const { Deno } = globalThis;
    return typeof Deno?.inspect === "function"
        ? Deno.inspect(v, {
            depth: Infinity,
            sorted: true,
            trailingComma: true,
            compact: false,
            iterableLimit: Infinity,
        })
        : `"${String(v).replace(/(?=["\\])/g, "\\")}"`;
}
function createColor(diffType, { background = false } = {}) {
    switch (diffType) {
        case DiffType.added:
            return (s) => background ? bgGreen(white(s)) : green(bold(s));
        case DiffType.removed:
            return (s) => background ? bgRed(white(s)) : red(bold(s));
        default:
            return white;
    }
}
function createSign(diffType) {
    switch (diffType) {
        case DiffType.added:
            return "+   ";
        case DiffType.removed:
            return "-   ";
        default:
            return "    ";
    }
}
function buildMessage(diffResult, { stringDiff = false } = {}) {
    const messages = [], diffMessages = [];
    messages.push("");
    messages.push("");
    messages.push(`    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${green(bold("Expected"))}`);
    messages.push("");
    messages.push("");
    diffResult.forEach((result) => {
        const c = createColor(result.type);
        const line = result.details?.map((detail) => detail.type !== DiffType.common
            ? createColor(detail.type, { background: true })(detail.value)
            : detail.value).join("") ?? result.value;
        diffMessages.push(c(`${createSign(result.type)}${line}`));
    });
    messages.push(...(stringDiff ? [diffMessages.join("")] : diffMessages));
    messages.push("");
    return messages;
}
function isKeyedCollection(x) {
    return [Symbol.iterator, "size"].every((k) => k in x);
}
export function equal(c, d) {
    const seen = new Map();
    return (function compare(a, b) {
        if (a &&
            b &&
            ((a instanceof RegExp && b instanceof RegExp) ||
                (a instanceof URL && b instanceof URL))) {
            return String(a) === String(b);
        }
        if (a instanceof Date && b instanceof Date) {
            const aTime = a.getTime();
            const bTime = b.getTime();
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                return true;
            }
            return a.getTime() === b.getTime();
        }
        if (Object.is(a, b)) {
            return true;
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
            if (a && b && !constructorsEqual(a, b)) {
                return false;
            }
            if (a instanceof WeakMap || b instanceof WeakMap) {
                if (!(a instanceof WeakMap && b instanceof WeakMap))
                    return false;
                throw new TypeError("cannot compare WeakMap instances");
            }
            if (a instanceof WeakSet || b instanceof WeakSet) {
                if (!(a instanceof WeakSet && b instanceof WeakSet))
                    return false;
                throw new TypeError("cannot compare WeakSet instances");
            }
            if (seen.get(a) === b) {
                return true;
            }
            if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
                return false;
            }
            if (isKeyedCollection(a) && isKeyedCollection(b)) {
                if (a.size !== b.size) {
                    return false;
                }
                let unmatchedEntries = a.size;
                for (const [aKey, aValue] of a.entries()) {
                    for (const [bKey, bValue] of b.entries()) {
                        if ((aKey === aValue && bKey === bValue && compare(aKey, bKey)) ||
                            (compare(aKey, bKey) && compare(aValue, bValue))) {
                            unmatchedEntries--;
                        }
                    }
                }
                return unmatchedEntries === 0;
            }
            const merged = { ...a, ...b };
            for (const key of [
                ...Object.getOwnPropertyNames(merged),
                ...Object.getOwnPropertySymbols(merged),
            ]) {
                if (!compare(a && a[key], b && b[key])) {
                    return false;
                }
                if (((key in a) && (!(key in b))) || ((key in b) && (!(key in a)))) {
                    return false;
                }
            }
            seen.set(a, b);
            if (a instanceof WeakRef || b instanceof WeakRef) {
                if (!(a instanceof WeakRef && b instanceof WeakRef))
                    return false;
                return compare(a.deref(), b.deref());
            }
            return true;
        }
        return false;
    })(c, d);
}
function constructorsEqual(a, b) {
    return a.constructor === b.constructor ||
        a.constructor === Object && !b.constructor ||
        !a.constructor && b.constructor === Object;
}
export function assert(expr, msg = "") {
    if (!expr) {
        throw new AssertionError(msg);
    }
}
export function assertEquals(actual, expected, msg) {
    if (equal(actual, expected)) {
        return;
    }
    let message = "";
    const actualString = _format(actual);
    const expectedString = _format(expected);
    try {
        const stringDiff = (typeof actual === "string") &&
            (typeof expected === "string");
        const diffResult = stringDiff
            ? diffstr(actual, expected)
            : diff(actualString.split("\n"), expectedString.split("\n"));
        const diffMsg = buildMessage(diffResult, { stringDiff }).join("\n");
        message = `Values are not equal:\n${diffMsg}`;
    }
    catch {
        message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
    }
    if (msg) {
        message = msg;
    }
    throw new AssertionError(message);
}
export function assertNotEquals(actual, expected, msg) {
    if (!equal(actual, expected)) {
        return;
    }
    let actualString;
    let expectedString;
    try {
        actualString = String(actual);
    }
    catch {
        actualString = "[Cannot display]";
    }
    try {
        expectedString = String(expected);
    }
    catch {
        expectedString = "[Cannot display]";
    }
    if (!msg) {
        msg = `actual: ${actualString} expected: ${expectedString}`;
    }
    throw new AssertionError(msg);
}
export function assertStrictEquals(actual, expected, msg) {
    if (actual === expected) {
        return;
    }
    let message;
    if (msg) {
        message = msg;
    }
    else {
        const actualString = _format(actual);
        const expectedString = _format(expected);
        if (actualString === expectedString) {
            const withOffset = actualString
                .split("\n")
                .map((l) => `    ${l}`)
                .join("\n");
            message =
                `Values have the same structure but are not reference-equal:\n\n${red(withOffset)}\n`;
        }
        else {
            try {
                const stringDiff = (typeof actual === "string") &&
                    (typeof expected === "string");
                const diffResult = stringDiff
                    ? diffstr(actual, expected)
                    : diff(actualString.split("\n"), expectedString.split("\n"));
                const diffMsg = buildMessage(diffResult, { stringDiff }).join("\n");
                message = `Values are not strictly equal:\n${diffMsg}`;
            }
            catch {
                message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
            }
        }
    }
    throw new AssertionError(message);
}
export function assertNotStrictEquals(actual, expected, msg) {
    if (actual !== expected) {
        return;
    }
    throw new AssertionError(msg ?? `Expected "actual" to be strictly unequal to: ${_format(actual)}\n`);
}
export function assertExists(actual, msg) {
    if (actual === undefined || actual === null) {
        if (!msg) {
            msg = `actual: "${actual}" expected to not be null or undefined`;
        }
        throw new AssertionError(msg);
    }
}
export function assertStringIncludes(actual, expected, msg) {
    if (!actual.includes(expected)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to contain: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
export function assertArrayIncludes(actual, expected, msg) {
    const missing = [];
    for (let i = 0; i < expected.length; i++) {
        let found = false;
        for (let j = 0; j < actual.length; j++) {
            if (equal(expected[i], actual[j])) {
                found = true;
                break;
            }
        }
        if (!found) {
            missing.push(expected[i]);
        }
    }
    if (missing.length === 0) {
        return;
    }
    if (!msg) {
        msg = `actual: "${_format(actual)}" expected to include: "${_format(expected)}"\nmissing: ${_format(missing)}`;
    }
    throw new AssertionError(msg);
}
export function assertMatch(actual, expected, msg) {
    if (!expected.test(actual)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to match: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
export function assertNotMatch(actual, expected, msg) {
    if (expected.test(actual)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to not match: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
export function assertObjectMatch(actual, expected) {
    const seen = new WeakMap();
    return assertEquals((function filter(a, b) {
        if ((seen.has(a)) && (seen.get(a) === b)) {
            return a;
        }
        seen.set(a, b);
        const filtered = {};
        const entries = [
            ...Object.getOwnPropertyNames(a),
            ...Object.getOwnPropertySymbols(a),
        ]
            .filter((key) => key in b)
            .map((key) => [key, a[key]]);
        for (const [key, value] of entries) {
            if (Array.isArray(value)) {
                const subset = b[key];
                if (Array.isArray(subset)) {
                    filtered[key] = value
                        .slice(0, subset.length)
                        .map((element, index) => {
                        const subsetElement = subset[index];
                        if ((typeof subsetElement === "object") && (subsetElement)) {
                            return filter(element, subsetElement);
                        }
                        return element;
                    });
                    continue;
                }
            }
            else if (typeof value === "object") {
                const subset = b[key];
                if ((typeof subset === "object") && (subset)) {
                    filtered[key] = filter(value, subset);
                    continue;
                }
            }
            filtered[key] = value;
        }
        return filtered;
    })(actual, expected), expected);
}
export function fail(msg) {
    assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}
export function assertThrows(fn, ErrorClass, msgIncludes = "", msg) {
    let doesThrow = false;
    try {
        fn();
    }
    catch (e) {
        if (e instanceof Error === false) {
            throw new AssertionError("A non-Error object was thrown.");
        }
        if (ErrorClass && !(e instanceof ErrorClass)) {
            msg =
                `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        if (msgIncludes &&
            !stripColor(e.message).includes(stripColor(msgIncludes))) {
            msg =
                `Expected error message to include "${msgIncludes}", but got "${e.message}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        doesThrow = true;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
}
export async function assertRejects(fn, ErrorClass, msgIncludes = "", msg) {
    let doesThrow = false;
    try {
        await fn();
    }
    catch (e) {
        if (e instanceof Error === false) {
            throw new AssertionError("A non-Error object was thrown or rejected.");
        }
        if (ErrorClass && !(e instanceof ErrorClass)) {
            msg =
                `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        if (msgIncludes &&
            !stripColor(e.message).includes(stripColor(msgIncludes))) {
            msg =
                `Expected error message to include "${msgIncludes}", but got "${e.message}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        doesThrow = true;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
}
export { assertRejects as assertThrowsAsync };
export function unimplemented(msg) {
    throw new AssertionError(msg || "unimplemented");
}
export function unreachable() {
    throw new AssertionError("unreachable");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzc2VydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUNMLE9BQU8sRUFDUCxLQUFLLEVBQ0wsSUFBSSxFQUNKLElBQUksRUFDSixLQUFLLEVBQ0wsR0FBRyxFQUNILFVBQVUsRUFDVixLQUFLLEdBQ04sTUFBTSxrQkFBa0IsQ0FBQztBQUMxQixPQUFPLEVBQUUsSUFBSSxFQUFjLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFakUsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUM7QUFPM0MsTUFBTSxPQUFPLGNBQWUsU0FBUSxLQUFLO0lBQ3ZDLFlBQVksT0FBZTtRQUN6QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDO0lBQy9CLENBQUM7Q0FDRjtBQU9ELE1BQU0sVUFBVSxPQUFPLENBQUMsQ0FBVTtJQUVoQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsVUFBaUIsQ0FBQztJQUNuQyxPQUFPLE9BQU8sSUFBSSxFQUFFLE9BQU8sS0FBSyxVQUFVO1FBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtZQUNoQixLQUFLLEVBQUUsUUFBUTtZQUNmLE1BQU0sRUFBRSxJQUFJO1lBQ1osYUFBYSxFQUFFLElBQUk7WUFDbkIsT0FBTyxFQUFFLEtBQUs7WUFDZCxhQUFhLEVBQUUsUUFBUTtTQUN4QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNuRCxDQUFDO0FBTUQsU0FBUyxXQUFXLENBQ2xCLFFBQWtCLEVBQ2xCLEVBQUUsVUFBVSxHQUFHLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFFM0IsUUFBUSxRQUFRLEVBQUU7UUFDaEIsS0FB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
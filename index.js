// sqlAPI - index.js
// =========================================
// Simple API to build customised SQL according given input parameters.
//
// @author: Joan Miquel Torres <jmtorres@112ib.com>
// @company: GEIBSAU
// @license: GPL
//
"use strict";

var Filters = {//{{{
    notEmpty: function(v){return v;},
    defined: function(v){return v !== undefined;},
};//}}}
var Parsers = {//{{{
    none: function dumbParser(v){return v;},
    argParse: function argParse(argSrc, argName, mandatory) {//{{{
        if (mandatory && argSrc === undefined) throw argName+" is mandatory"; // Detect omissions.
        if (! (argSrc instanceof Array)) argSrc = [argSrc]; // Accept single element as shortcut.
        argSrc = argSrc.filter(Filters.notEmpty); // Drop empty items.
        if (typeof mandatory == "number" && argSrc.length < mandatory) throw argName+" requires at least "+mandatory+" items.";
        return argSrc;
    },//}}}
};//}}}
function guess (preffix, str) {//{{{
    return str.length ? preffix + str : "";
};//}}}

// -----------------------------

function sqlBuilder(qry, prm) {//{{{
    if (typeof qry == "string") { // Manual operation for too simple querys:
        // NOTE: In this mode, prm is expected to be single parameter, propperly ordered array or undefined.
        prm = prm === undefined
            ? []
            : prm instanceof Array
                ? prm
                : [prm]
        ;
        return [qry, prm];
    };
    var select = Parsers.argParse(qry.select, "select", true);
    var from = Parsers.argParse(qry.from, "from", true);
    var where = Parsers.argParse(qry.where, "where", false);
    var orderBy = Parsers.argParse(qry.orderBy, "orderBy", false);

    var args = [];

    var sql = "select " + select.join(",")
        + " from " + from
            .join(" join ")
            .replace(/ join (left |right )?outer /, " $1 outer join ") // Allow "outer tableName".
    ;
    if (where) sql += guess(" where ", where
        .map(function(w){
            var parts = ((w instanceof Array)
                ? w
                : w.split(" ", 3)
            ).filter(Filters.defined);

            var fmt = (typeof parts[parts.length - 1] == "function") // Formatting callback.
                ? parts.pop()
                : false
            ;

            if (parts.length >= 3) return w; // Guess constant (Ex.: "someNumber >= 15").
            w = parts[0];
            var argName = parts[1];

            // Pick operator:
            var op = w.match(/[^.\w].*$/);
            if (op) {
                op=op[0]; // Pick.
                w=w.substring(0,w.length-op.length); // Remove.
                if (op.match(/=\w/)) op = " "+op.substring(1)+" "; // =like, =ilike...
            } else {
                op="="; // Default to equality.
            };

            // Pick argument name:
            if (! argName) {
                argName = w.replace(/^(?:.*\.)?(.*)$/, "$1")
            } else {
                w = w.replace(/ .*$/, ""); // Remove alias spec.
            };

            // Render condition ONLY if argument is defined:
            if (prm[argName] !== undefined) {
                args[args.length]=fmt
                    ? fmt(prm[argName]) // Apply formatting callback if specified.
                    : prm[argName]
                ;
                return w+op+"$"+args.length;
            };
        })
        .filter(Filters.notEmpty) // Remove undefined arguments.
        .join(" and ")
    );
    if (orderBy) sql += guess(" order by ", orderBy.join(","));

    return [sql, args];
    
};//}}}

function queryFactory (//{{{
    promiseQueryFn, // function(sql, arguments) //-> Returning promise.
    onFullfill,     // Fullfill parser (Optional).
    onReject        // Reject parser (Optional).
) {

    onFullfill || (onFullfill = Parsers.none);
    onReject || (onReject = Parsers.none);

    return function promisory(querySpec){
        return function(flt){
            if (typeof querySpec == "string") flt = undefined; // Simple syntax only useful with no parameters.
            return new Promise(function(resolve, reject){
                var input = sqlBuilder(querySpec, flt);
                promiseQueryFn(
                    input[0]    // SQL
                    , input[1]  // Arguments
                ).then(function(data){
                    resolve(onFullfill(data));
                }).catch(function(err){
                    reject(onReject(err));
                });
            });
        };
    };

};//}}}



module.exports = {
    build: sqlBuilder,
    factory: queryFactory,
};

// TESTING:
// ========
//
// To test any example from README.md or your own ones, comment out below line
// and paste its code next to it: 
//
// var query = module.exports;
//
// (your testing code here)

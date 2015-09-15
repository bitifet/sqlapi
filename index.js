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
    pickFirst: function pickFirst(v){return v[0];},
};//}}}
function guess (preffix, str) {//{{{
    return str.length ? preffix + str : "";
};//}}}

// -----------------------------


var sqlBuilder = (function(){

    function buildQuery(qry, prm, args) {//{{{

        function pushCondition(w, prm, fmt){//{{{
            function pushArgs(argName){//{{{
                argName = argName.substring(1); // Remove '$' sign.
                if (prm[argName] === undefined) {
                    missing = true;
                    return "";
                };
                newArgs[newArgs.length] = fmt
                    ? fmt(prm[argName], argName) // Apply formatting callback if specified.
                    : prm[argName]
                ;
                return "$"+(i++);
            };//}}}

            var i = args.length + 1;
            var missing = false;
            var newArgs = [];

            w = w.replace(
                /\$[a-zA-Z]\w*\b/g
                , pushArgs
            );

            if (missing) return;
            args = args.concat(newArgs);
            return w;

        };//}}}

        function argParse(argSrc, argName, mandatory) {//{{{
            if (mandatory && argSrc === undefined) throw argName+" is mandatory"; // Detect omissions.
            if (! (argSrc instanceof Array)) argSrc = [argSrc]; // Accept single element as shortcut.
            argSrc = argSrc.filter(Filters.notEmpty); // Drop empty items.
            if (typeof mandatory == "number" && argSrc.length < mandatory) throw argName+" requires at least "+mandatory+" items.";
            return argSrc;
        };//}}}

        function simpleWhere(w){//{{{

            var parts = w.split(" ", 3).filter(Filters.defined);
            if (parts.length >= 3) return [w]; // Guess constant (Ex.: "someNumber >= 15").
            w = parts[0];

            var op = w.match(/[^.\w()].*$/);
            if (op) {
                op=op[0]; // Pick.
                w=w.substring(0,w.length-op.length); // Remove.
                if (op.match(/=\w/)) op = " "+op.substring(1)+" "; // =like, =ilike...
            } else {
                op="="; // Default to equality.
            };

            // Pick argument name:
            var argName = parts[1];
            if (! argName) {
                argName = w.replace(/^(?:.*\.)?(.*)$/, "$1")
            } else {
                w = w.replace(/ .*$/, ""); // Remove alias spec.
            };

            if (! argName.match(/\$/)) argName = "$"+argName; // Backward compatibility.

            return [w, op, argName];

        };//}}}

        function subQuery(subQry) {//{{{
            if (typeof subQry != "object") return subQry;
            var sql = "("+buildQuery(subQry, prm, args)[0]+")";
            return subQry.as
                ? sql+" as "+subQry.as
                : sql
            ;
        };//}}}

        if (typeof qry == "string") { // Manual operation for too simple querys:
            // NOTE: In this mode, prm is expected to be single parameter, propperly ordered array or undefined.
            prm = prm === undefined
                ? []
                : prm instanceof Array
                    ? prm
                    : [prm]
            ;
            return [qry, prm];
        } else if (prm === undefined) {
            prm = {};
        };

        var select = argParse(qry.select, "select", true).map(subQuery);
        var from = argParse(qry.from, "from", true).map(subQuery);
        var where = argParse(qry.where, "where", false);
        var orderBy = argParse(qry.orderBy, "orderBy", false).map(subQuery);

        var sql = "select " + select.join(",")
            + " from " + from
                .join(" join ")
                .replace(/ join (left |right )?outer /, " $1outer join ") // Allow "outer tableName".
        ;



        if (where) sql += guess(" where ", where
            .map(function(w){

                var fmt = false;

                if (typeof w == "string") w = simpleWhere(w);

                var cnd = w
                    .map(function(w){

                        switch (typeof w) {
                            case "function":
                                fmt = w;
                                return "";
                            case "string":
                                return w;
                            case "object":
                                return subQuery(w);
                            default:
                                throw "Wrong where clausule item: " + w;

                        };

                    })
                    .filter(Filters.defined)
                    .join (" ")
                ;
                return pushCondition(cnd, prm, fmt);

            })
            .filter(Filters.notEmpty) // Remove undefined arguments.
            .join(" and ")
        );
        if (orderBy) sql += guess(" order by ", orderBy.join(","));

        return [sql, args];
        
    };//}}}

    return function builder (qry, prm) {
        return buildQuery(qry, prm, []);
    };

})();

function queryFactory (//{{{
    promiseQueryFn      // function(sql, arguments) //-> Returning promise.
    , def_onFinalFullfill   // Default final Fullfill parser (Optional).
    , def_onFinalReject     // Default final Reject parser (Optional).
    , def_onStepFullfill    // Default per-step Fullfill parser (Optional).
    , def_onStepReject      // Default per-step Reject parser (Optional).
) {

    return function promisory(
        querySpec
        , onFinalFullfill
        , onFinalReject
        , onStepFullfill
        , onStepReject
    ) {

        // Apply default parsers when not explicitly provided:
        onFinalFullfill || (onFinalFullfill = def_onFinalFullfill);
        onFinalReject || (onFinalReject = def_onFinalReject);
        onStepFullfill || (onStepFullfill = def_onStepFullfill);
        onStepReject || (onStepReject = def_onStepReject);

        // Accept single of multiple querys:
        if (! (querySpec instanceof Array)) querySpec = [querySpec];

        // Apply default implementations to unspecified parsers:
        onFinalFullfill || (onFinalFullfill = (querySpec.length > 1)
            ? Parsers.none
            : Parsers.pickFirst // Avoid forcing to manually pick when single query is provided.
        );
        onFinalReject || (onFinalReject = Parsers.none);
        onStepFullfill || (onStepFullfill = Parsers.none);
        onStepReject || (onStepReject = Parsers.none);

        return function(flt){

            var me = this;
            var args = arguments;

            // Accept single (common) or multiple (per query) parameter sets:
            if (! (flt instanceof Array)) flt = Array.apply(null, {length: querySpec.length}).map(function(){return flt;});
            flt = flt.map(function(flt, i){ // Should be sepparated process because flt could already be an Array.
                if (typeof querySpec[i] == "string") return undefined; // Simple syntax only useful with no parameters.
                return flt;
            });

            return new Promise(function(resolve, reject){
                Promise.all(querySpec.map(function(qspc, i){
                    if (typeof qspc == "function") return qspc.apply(me, args); // Allow to provide alternative implementation.
                    return Promise.resolve(promiseQueryFn.apply(this,sqlBuilder(qspc, flt[i])));
                })).then(function(data){
                    resolve(
                        onFinalFullfill(
                            data.map(onStepFullfill)
                        )
                    );
                }).catch(function(err){
                    reject(
                        onFinalReject(
                            onStepReject(err)
                        )
                    );
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

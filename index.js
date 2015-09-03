// sqlAPI - index.js
// =========================================
// Simple API to build customised SQL according given input parameters.
//
// @author: Joan Miquel Torres <jmtorres@112ib.com>
// @company: GEIBSAU
// @license: GPL
//
"use strict";

var queryBuilder = (function(){
    var filters = {//{{{
        notEmpty: function(v){return v;},
    };//}}}
    function argParse(argSrc, argName, mandatory) {//{{{
        if (mandatory && argSrc === undefined) throw argName+" is mandatory"; // Detect omissions.
        if (! (argSrc instanceof Array)) argSrc = [argSrc]; // Accept single element as shortcut.
        argSrc = argSrc.filter(filters.notEmpty); // Drop empty items.
        if (typeof mandatory == "number" && argSrc.length < mandatory) throw argName+" requires at least "+mandatory+" items.";
        return argSrc;
    };//}}}
    function guess (preffix, str) {//{{{
        return str.length ? preffix + str : "";
    };//}}}
    return function queryBuilder(qry, prm) {//{{{
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
        var select = argParse(qry.select, "select", true);
        var from = argParse(qry.from, "from", true);
        var where = argParse(qry.where, "where", false);
        var orderBy = argParse(qry.orderBy, "orderBy", false);

        var args = [];

        var sql = "select " + select.join(",")
            + " from " + from
                .join(" join ")
                .replace(/ join (left |right )?outer /, " $1 outer join ") // Allow "outer tableName".
        ;
        if (where) sql += guess(" where ", where
            .map(function(w){
                var parts = w.split(" ", 3);
                if (parts.length >= 3) return w; // Guess constant (Ex.: "someNumber >= 15").
                w = parts[0];
                var argName = parts[1];

                // Pick operator:
                var op = w.match(/\W+$/);
                if (op) {
                    op=op[0]; // Pick.
                    w=w.substring(0,w.length-op.length); // Remove.
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
                    args[args.length]=prm[argName];
                    return w+op+"$"+args.length;
                };
            })
            .filter(filters.notEmpty) // Remove undefined arguments.
            .join(" and ")
        );
        if (orderBy) sql += " order by " + orderBy.join(",");

        return [sql, args];
        
    };//}}}
})();

module.exports = {
    build: queryBuilder,
};


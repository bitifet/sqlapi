// sqlAPI - index.js
// =========================================
// Simple API to build customised SQL according given input parameters.
//
// @author: Joan Miquel Torres <jmtorres@112ib.com>
// @company: GEIBSAU
// @license: GPL
//
"use strict";

var queryBuilder = (function(){//{{{
    var filters = {
        notEmpty: function(v){return v;},
    };
    function argParse(argSrc, argName, mandatory) {//{{{
        if (mandatory && argSrc === undefined) throw argName+" is mandatory"; // Detect omissions.
        if (! (argSrc instanceof Array)) argSrc = [argSrc]; // Accept single element as shortcut.
        argSrc = argSrc.filter(filters.notEmpty); // Drop empty items.
        if (typeof mandatory == "number" && argSrc.length < mandatory) throw argName+" requires at least "+mandatory+" items.";
        return argSrc;
    };//}}}
    function guess (preffix, str) {
        return str.length ? preffix + str : "";
    };
    return function queryBuilder(qry, prm) {//{{{
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
                var prmName = w.split(" ", 2)[1];
                if (! prmName) {
                    prmName = w.replace(/^(?:.*\.)?(.*)$/, "$1")
                } else {
                    w = w.replace(/ .*$/, ""); // Remove alias spec.
                };
                if (prm[prmName] !== undefined) {
                    args[args.length]=prm[prmName];
                    return w+"=$"+args.length;
                };
            })
            .filter(filters.notEmpty)
            .join(" and ")
        );
        if (orderBy) sql += " order by " + orderBy.join(",");



        return [sql, args];
        
    };//}}}
})();//}}}

module.exports = {
    build: queryBuilder,
};


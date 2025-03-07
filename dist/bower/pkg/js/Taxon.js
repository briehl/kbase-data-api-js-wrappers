/**
 * @module Taxon
 * @author Erik Pearson
 * @version 0.1.0
 * @param {type} taxon
 * @param {type} Thrift
 * @param {type} Promise
 * @returns {Taxon_L12.factory}
 */
/*global define */
/*jslint
 white: true, browser: true
 */
define([
    'taxon',
    'thrift',
    'bluebird'
], function (taxon, Thrift, Promise) {
    // API Implementation
    /*
     * Taxon wrapps a single instance of "taxon".
     * thrift api does not work this way, it is a set of functions
     */

    /**
     * 
     * @constructor
     * @alias module:Taxon
     */
    var Taxon = function (config) {
        var objectReference,
            dataAPIUrl,
            authToken,
            transport,
            protocol,
            timeout,
            client;

        if (!config) {
            throw {
                type: 'ArgumentError',
                title: 'Configuration object missing',
                suggestion: 'This is an API usage error'
            }
        }

        // Construction argument contract enforcement:
        
        objectReference = config.ref;
        if (!objectReference) {
            throw {
                type: 'ArgumentError',
                title: 'Object reference "ref" missing',
                suggestion: 'This is an API usage error'
            }
        }

        dataAPIUrl = config.url;
        if (!dataAPIUrl) {
            throw {
                type: 'ArgumentError',
                message: 'Cannot find a url for the data api',
                suggestion: 'The url should be provided as an argument as "url"'
            };

        }

        authToken = config.token;
        if (!authToken) {
            throw {
                type: 'ArgumentError',
                message: 'No Authorization found; Authorization is required for the data api',
                suggestion: 'The authorization may be provided in the "token" argument, or in the "runtime.getAuthToken()" method'
            };
        }
        
        timeout = config.timeout;
        if (!timeout) {
            timeout = 30000;
        }

        try {
            transport = new Thrift.TXHRTransport(dataAPIUrl, {timeout: timeout});
            protocol = new Thrift.TJSONProtocol(transport);
            client = new taxon.TaxonServiceClient(protocol);
        } catch (ex) {
            throw {
                type: 'ThrifError',
                message: 'An error was encountered creating the thrift client objects',
                suggestion: 'This could be a configuration or runtime error. Please consult the console for the error object',
                errorObject: ex
            };
        }


        /**
         * 
         * @returns {String}
         */
        function getParent() {
            return Promise.resolve(client.get_parent(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {Array<String>}
         */
        function getChildren() {
            return Promise.resolve(client.get_children(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {Array<String>}
         */
        function getGenomeAnnotations() {
            return Promise.resolve(client.get_genome_annotations(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {Array<String>}
         */
        function getScientificLineage() {
            return Promise.resolve(client.get_scientific_lineage(authToken, objectReference, true))
                .then(function (data) {
                    return data.split(';').map(function (x) {
                        return x.trim(' ');
                    });
                });
        }

        /**
         * 
         * @returns {String}
         */
        function getScientificName() {
            return Promise.resolve(client.get_scientific_name(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {Number}
         */
        function getTaxonomicId() {
            return Promise.resolve(client.get_taxonomic_id(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {String}
         */
        function getKingdom() {
            return Promise.resolve(client.get_kingdom(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {String}
         */
        function getDomain() {
            return Promise.resolve(client.get_domain(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {Number}
         */
        function getGeneticCode() {
            return Promise.resolve(client.get_genetic_code(authToken, objectReference, true));
        }

        /**
         * 
         * @returns {Array<String>}
         */
        function getAliases() {
            return Promise.resolve(client.get_aliases(authToken, objectReference, true));
        }

        // API
        return Object.freeze({
            getParent: getParent,
            getChildren: getChildren,
            getGenomeAnnotations: getGenomeAnnotations,
            getScientificLineage: getScientificLineage,
            getScientificName: getScientificName,
            getTaxonomicId: getTaxonomicId,
            getKingdom: getKingdom,
            getDomain: getDomain,
            getGeneticCode: getGeneticCode,
            getAliases: getAliases
        });

    };

    return Taxon;
});
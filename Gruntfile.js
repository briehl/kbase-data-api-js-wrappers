/*global require, module */
/*jslint white: true */
var path = require('path');
var fs = require('fs');
module.exports = function (grunt) {
    'use strict';

    // The runtime directory holds a build and dist directory and other files
    // required to actually run the build client and server.
    var runtimeDir = 'runtime';

    // The build directory is the destination for the KBase source, messaged
    // external dependencies, and other files needed to run the client and server
    // components. The build directory can be used directly in development mode,
    // since it contains normal, un-minified javascript.
    var buildDir = runtimeDir + '/build';

    var distDir = runtimeDir + '/dist';

    var testDir = runtimeDir + '/test';

    function makeBuildPath(subdir) {
        if (subdir) {
            return path.normalize(buildDir + '/' + subdir);
        }
        return path.normalize(buildDir);
    }
    
    function makeRuntimePath(subdir) {
        if (subdir) {
            return path.normalize(runtimeDir + '/' + subdir);
        }
        return path.normalize(runtimeDir);
    }

    // Load grunt npm tasks..
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mkdir');
    grunt.loadNpmTasks('grunt-bower-task');

    /*
     * 
     * notes on "fixers"
     * - add js lint config to decrease noise of harmless lint violations
     * - wrap in define
     * - set strict mode
     * - determine the name of the "subject" and return it as the module object
     * - modest code repair to assist in reducing lint noise (and of course improve code reliability)
     */
    function fixThrift1(content) {
        var namespaceRe = /^if \(typeof ([^\s\+]+)/m,
            namespace = content.match(namespaceRe)[1],
            lintDecls = '/*global define */\n/*jslint white:true */',
            requireJsStart = 'define(["thrift"], function (Thrift) {\n"use strict";',
            requireJsEnd = 'return ' + namespace + ';\n});',
            fixDeclRe = /if \(typeof ([^\s]+) === 'undefined'\) {\n[\s]*([^\s]+) = {};\n}/,
            repairedContent = content
            .replace(fixDeclRe, 'var $1 = {};\n')
            .replace(/([^=!])==([^=])/g, '$1===$2')
            .replace(/!=([^=])/g, '!==$1');

        return [lintDecls, requireJsStart, repairedContent, requireJsEnd].join('\n');
    }
    function fixThrift2(content) {
        var lintDecls = '/*global define */\n/*jslint white:true */',
            namespaceRe = /^([^\/\s\.]+)/m,
            namespace = content.match(namespaceRe)[1],
            requireJsStart = 'define(["thrift", "' + namespace + '_types"], function (Thrift, ' + namespace + ') {\n"use strict";',
            requireJsEnd = 'return ' + namespace + ';\n});',
            repairedContent = content
            .replace(/([^=!])==([^=])/g, '$1===$2')
            .replace(/!=([^=])/g, '!==$1');

        return [lintDecls, requireJsStart, repairedContent, requireJsEnd].join('\n');
    }
    function fixThriftLib(content) {
        var lintDecls = '/*global define */\n/*jslint white:true */',
            namespaceRe = /^var (.+?) = /m,
            namespace = content.match(namespaceRe)[1],
            requireJsStart = 'define(["jquery"], function (jQuery) {\n"use strict";',
            requireJsEnd = 'return ' + namespace + ';\n});',
            repairedContent = content
            .replace(/([^=!])==([^=])/g, '$1===$2')
            .replace(/!=([^=])/g, '!==$1');

        return [lintDecls, requireJsStart, repairedContent, requireJsEnd].join('\n');
    }

    // Bower magic.
    /* 
     * This section sets up a mapping for bower packages.
     * Believe it or not this is shorter and easier to maintain 
     * than plain grunt-contrib-copy.
     * NB: please keep this list in alpha order by dir and then name.
     * 
     */
    var bowerFiles = [
        {
            name: 'bluebird',
            cwd: 'js/browser',
            src: ['bluebird.js']
        },
        {
            name: 'jquery',
            cwd: 'dist',
            src: ['jquery.js']
        },
        {
            name: 'kbase-common-js',
            cwd: 'src/js',
            src: ['**/*']
        },
        {
            dir: 'requirejs',
            name: 'require'
        },
        {
            name: 'yaml',
            dir: 'require-yaml'
        },
        {
            name: 'js-yaml',
            cwd: 'dist'
        },
        {
            name: 'text',
            dir: 'requirejs-text'
        }
    ],
        bowerCopy = bowerFiles.map(function (cfg) {
            // path is like dir/path/name
            var path = [];
            // dir either dir or name is the first level directory.
            // path.unshift(cfg.dir || cfg.name);

            // If there is a path (subdir) we add that too.
            if (cfg.path) {
                path.unshift(cfg.path);
            }

            // Until we get a path which we use as a prefix to the src.
            var pathString = path
                .filter(function (el) {
                    if (el === null || el === undefined || el === '') {
                        return false;
                    }
                    return true;
                })
                .join('/');

            var srcs = (function () {
                if (cfg.src === undefined) {
                    return [cfg.name + '.js'];
                } else {
                    if (typeof cfg.src === 'string') {
                        return [cfg.src];
                    } else {
                        return cfg.src;
                    }
                }
            }());

            var sources = srcs.map(function (s) {
                return [pathString, s]
                    .filter(function (el) {
                        if (el === null || el === undefined || el === '') {
                            return false;
                        }
                        return true;
                    })
                    .join('/');
            });

            var cwd = cfg.cwd;
            if (cwd && cwd.charAt(0) === '/') {
            } else {
                cwd = 'bower_components/' + (cfg.dir || cfg.name) + (cwd ? '/' + cwd : '');
            }
            return {
                nonull: true,
                expand: true,
                cwd: cwd,
                src: sources,
                dest: makeBuildPath('bower_components') + '/' + (cfg.dir || cfg.name)
            };
        });


    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            bower: {
                files: bowerCopy
            },
            'bower-package': {
                files: [
                    {
                        cwd: 'runtime/build',
                        src: 'js/**/*',
                        dest: 'dist/bower/pkg',
                        expand: true
                    }
                ]
            },
            runtime: {
                files: [
                    {
                        // copy the sample test config into the runtime semi-permanent config.
                        cwd: 'src/config',
                        src: 'test.yml',
                        dest: makeRuntimePath('config'),
                        expand: true,
                        filter: function (sourceFilePath) {
                            var path = require('path'),
                                dest = path.join(makeRuntimePath('config/test.yml'));
                            if (grunt.file.exists(dest)) {
                                return false;
                            }
                            return true;
                        }
                    }
                ]
            },
            build: {
                files: [
                    {
                        cwd: 'src/js',
                        src: '**/*',
                        dest: makeBuildPath('js'),
                        expand: true
                    },
                    // Files for "eyeball" browser testing and development
                    {
                        cwd: 'src/htdocs',
                        src: '**/*',
                        dest: makeBuildPath('htdocs'),
                        expand: true
                    },     
                    // Copy the runtime test config into the main client config.
                    // runtime/config/test.yml is first copied and then hand-maintained
                    // the copy task will not overwrite it
                    {
                        src: makeRuntimePath('config/test.yml'),
                        dest: makeBuildPath('config/config.yml')
                    }
                ]
            },
            taxonLib1: {
                files: [
                    {
                        cwd: 'temp/gen-js',
                        src: 'taxon_types.js',
                        dest: makeBuildPath('js/thrift'),
                        expand: true
                    }
                ],
                options: {
                    process: function (content) {
                        return fixThrift1(content);
                    }
                }
            },
            taxonLib2: {
                files: [
                    {
                        cwd: 'temp/gen-js',
                        src: 'TaxonService.js',
                        dest: makeBuildPath('js/thrift'),
                        expand: true
                    }
                ],
                options: {
                    process: function (content) {
                        return fixThrift2(content);
                    }
                }
            },
            thriftLib: {
                files: [
                    {
                        cwd: 'bower_components/thrift/lib/js/src',
                        src: 'thrift.js',
                        dest: makeBuildPath('js/thrift'),
                        expand: true
                    }
                ],
                options: {
                    process: function (content) {
                        return fixThriftLib(content);
                    }
                }
            }
        },
        clean: {
            build: {
                src: [makeBuildPath()],
                // We force, because our build directory may be up a level 
                // in the runtime directory.
                options: {
                    force: true
                }
            },
            temp: {
                src: 'temp'
            }
        },
        shell: {
            makeTaxonLib: {
                command: [
                    'thrift',
                    '-gen js:jquery',
                    '-o temp',
                    'bower_components/data-api/thrift/specs/taxonomy/taxon/taxon.thrift'
                ].join(' '),
                options: {
                    stderr: false
                }
            }
        },
        mkdir: {
            temp: {
                options: {
                    create: ['temp']
                }
            }
        },
        bower: {
            install: {
                options: {
                    copy: false
                }
            }
        }
    });

    grunt.registerTask('build', [
        'bower:install',
        'copy:runtime',
        'copy:bower',
        'copy:build',
        'build-thrift-libs',
        'copy:bower-package'
    ]);

    grunt.registerTask('build-thrift-libs', [
        'clean:temp',
        'mkdir:temp',
        'shell:makeTaxonLib',
        'copy:taxonLib1',
        'copy:taxonLib2',
        'copy:thriftLib'
    ]);
};

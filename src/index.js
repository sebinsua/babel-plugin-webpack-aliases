import { join, resolve, relative, isAbsolute, dirname } from 'path'
import {
    StringLiteral,
    variableDeclaration,
    variableDeclarator,
    memberExpression,
    identifier,
    stringLiteral
} from 'babel-types'
import findUp from 'find-up'

const DEFAULT_WEBPACK_PATH = 'webpack.config.js'
const PACKAGE_JSON_PATH = 'package.json'

const packageJson = require(findUp.sync(PACKAGE_JSON_PATH))
const dependencies = Object.keys(
    Object.assign(
        {},
        packageJson.dependencies || {},
        packageJson.peerDependencies || {},
        packageJson.devDependencies || {}
    )
)

function getConfig({
    config: configPath = DEFAULT_WEBPACK_PATH,
    findConfig = false
}) {
    // Get webpack config
    const resolvedConfigPath = findConfig
        ? findUp.sync(configPath)
        : resolve(process.cwd(), configPath)

    let requiredConfig = require(resolvedConfigPath)
    if (requiredConfig && requiredConfig.__esModule && requiredConfig.default) {
        requiredConfig = requiredConfig.default
    }

    let config = requiredConfig
    if (typeof requiredConfig === 'function') {
        config = requiredConfig(process.env.NODE_ENV)
    }

    return config
}

function transformFilePathWithAliases(
    aliasConf,
    filePath,
    currentWorkingDirectory
) {
    for (const aliasFrom in aliasConf) {
        if (aliasConf.hasOwnProperty(aliasFrom)) {
            let aliasTo = aliasConf[aliasFrom]

            // If the regex matches, replace by the right config
            const aliasFromRegex = new RegExp(`^${aliasFrom}(\/|$)`)
            if (aliasFromRegex.test(filePath)) {
                if (dependencies.includes(aliasTo)) {
                    return filePath.replace(aliasFrom, aliasTo)
                }

                // If the filepath is not absolute, make it absolute
                if (!isAbsolute(aliasTo)) {
                    aliasTo = join(process.cwd(), aliasTo)
                }

                let relativeAliasPath = relative(
                    currentWorkingDirectory,
                    aliasTo
                ).replace(/\\/g, '/')

                if (relativeAliasPath.length === 0) {
                    relativeAliasPath = '.'
                }

                const aliasFilePath = filePath.replace(
                    aliasFrom,
                    relativeAliasPath
                )

                return aliasFilePath.charAt(0) === '.'
                    ? aliasFilePath
                    : `./${aliasFilePath}`
            }
        }
    }

    return filePath
}

function createWindowExternal(namespace, importNames, external) {
    return variableDeclaration('var', [
        variableDeclarator(
            importNames.length > 1
                ? identifier(importNames)
                : identifier(importNames),
            memberExpression(
                memberExpression(
                    identifier('window'),
                    stringLiteral(namespace),
                    true
                ),
                stringLiteral(external),
                true
            )
        )
    ])
}

export default function transformImportsWithAliases({ types: t }) {
    return {
        visitor: {
            ImportDeclaration(
                path,
                {
                    file: { opts: { filename } },
                    opts = {
                        config: DEFAULT_WEBPACK_PATH,
                        findConfig: false
                    }
                }
            ) {
                // Get webpack config
                const config = getConfig(opts)

                // If the config comes back as null, we didn't find it, so throw an exception.
                if (!config) {
                    throw new Error(
                        `Cannot find configuration file: ${opts.config}`
                    )
                }

                // Exit if there's no alias config
                if (!config.resolve || !config.resolve.alias) {
                    return
                }

                // Get the webpack alias config
                const aliasConf = config.resolve.alias

                const { source } = path.node
                // Exit if the import path is not a string literal
                if (!t.isStringLiteral(source)) {
                    return
                }

                // Get the path of the StringLiteral
                const originalFilePath = source.value

                const isExternal = true
                if (isExternal === false) {
                    const requiredFilePath = transformFilePathWithAliases(
                        aliasConf,
                        originalFilePath,
                        dirname(filename)
                    )

                    path.node.source = StringLiteral(requiredFilePath)
                } else {
                    // TODO: This should only happen when there is an external in the config,
                    //       and then it should happen as expected.
                    //       Also, we should handle destructuring partially at least.
                    const importNames = path.node.specifiers.map(
                        s => s.local.name
                    )
                    path.replaceWith(
                        createWindowExternal(
                            'namespace',
                            importNames,
                            originalFilePath
                        )
                    )
                }
            },
            CallExpression(
                path,
                {
                    file: { opts: { filename } },
                    opts = {
                        config: DEFAULT_WEBPACK_PATH,
                        findConfig: false
                    }
                }
            ) {
                // Get webpack config
                const config = getConfig(opts)

                // If the config comes back as null, we didn't find it, so throw an exception.
                if (!config) {
                    throw new Error(
                        `Cannot find configuration file: ${opts.config}`
                    )
                }

                // Exit if there's no alias config
                if (!config.resolve || !config.resolve.alias) {
                    return
                }

                // Get the webpack alias config
                const aliasConf = config.resolve.alias

                const {
                    callee: { name: calleeName },
                    arguments: args
                } = path.node
                // Exit if it's not a require statement
                if (
                    calleeName !== 'require' ||
                    !args.length ||
                    !t.isStringLiteral(args[0])
                ) {
                    return
                }

                // Get the path of the StringLiteral
                const originalFilePath = args[0].value

                const isExternal = true
                if (isExternal === false) {
                    const requiredFilePath = transformFilePathWithAliases(
                        aliasConf,
                        originalFilePath,
                        dirname(filename)
                    )

                    path.node.arguments = [StringLiteral(requiredFilePath)]
                } else {
                    const importNames = path
                        .find(p => p.isVariableDeclaration())
                        .node.declarations.map(d => d.id.name)
                    path.replaceWith(
                        createWindowExternal(
                            'namespace',
                            importNames,
                            originalFilePath
                        )
                    )
                }
            }
        }
    }
}

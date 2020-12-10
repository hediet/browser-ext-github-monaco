import * as webpack from "webpack";
import path = require("path");
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
import ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

const r = (file: string) => path.resolve(__dirname, file);

const useCdnForMonaco = process.argv.indexOf("--use-cdn-for-monaco") !== -1;

module.exports = {
	entry: {
		"content-script": r("./src/content-script"),
		"content-script-main": r("./src/content-script-main/index"),
	},
	output: {
		path: r("./dist"),
		filename: "[name].js",
	},
	devtool: "source-map",
	externals: {
		vscode: "commonjs vscode",
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{ test: /\.css$/, loader: "style-loader!css-loader" },
			{ test: /\.scss$/, loader: "style-loader!css-loader!sass-loader" },
			{
				test: /\.(jpe?g|png|gif|eot|ttf|svg|woff|woff2|md)$/i,
				loader: "file-loader",
			},
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				loader: "ts-loader",
				options: { transpileOnly: true },
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new webpack.EnvironmentPlugin({
			NODE_ENV: null,
			USE_CDN_FOR_MONACO: useCdnForMonaco ? "1" : "0",
		}),
		new ForkTsCheckerWebpackPlugin(),
		new CleanWebpackPlugin(),
		...(useCdnForMonaco
			? []
			: [
					new MonacoWebpackPlugin({
						languages: ["markdown"],
					}),
			  ]),
	],
} as webpack.Configuration;

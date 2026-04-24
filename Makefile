all:
	npm install
	npx webpack --config webpack.config.js
	npm install --prefix trace-dashboard

.PHONY: all

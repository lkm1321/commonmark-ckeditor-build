/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module markdown-gfm/commonmarkdataprocessor
 */

/* eslint-env browser */

import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import DomConverter from '@ckeditor/ckeditor5-engine/src/view/domconverter';
import {highlightedCodeBlock, taskListItems} from 'turndown-plugin-gfm';
import TurndownService from 'turndown';
import {replaceWhitespaceWithin} from './utils/whitespace';

export const originalSrcAttribute = 'data-original-src';

/**
 * This data processor implementation uses CommonMark as input/output data.
 *
 * @implements module:engine/dataprocessor/dataprocessor~DataProcessor
 */
export default class CommonMarkDataProcessor {
	constructor() {
		this._htmlDP = new HtmlDataProcessor();
		this._domConverter = new DomConverter();
	}

	/**
	 * Converts the provided CommonMark string to view tree.
	 *
	 * @param {String} data A CommonMark string.
	 * @returns {module:engine/view/documentfragment~DocumentFragment} The converted view element.
	 */
	toView( data ) {
		const md = require( 'markdown-it' )( {
			// Output html
			html: true,
			// Use GFM language fence prefix
			langPrefix: 'language-',
		} );
		const html = md.render( data );

		return this._htmlDP.toView( html );
	}

	/**
	 * Converts the provided {@link module:engine/view/documentfragment~DocumentFragment} to data format &mdash; in this
	 * case to a CommonMark string.
	 *
	 * @param {module:engine/view/documentfragment~DocumentFragment} viewFragment
	 * @returns {String} CommonMark string.
	 */
	toData( viewFragment ) {
		// Convert view DocumentFragment to DOM DocumentFragment.
		const domFragment = this._domConverter.viewToDom( viewFragment, document );

		// Replace leading and trailing nbsp at the end of strong and em tags
		// with single spaces
		replaceWhitespaceWithin(domFragment, ['strong', 'em']);

		// Use Turndown to convert DOM fragment to markdown
		const turndownService = new TurndownService( {
			headingStyle: 'atx',
			codeBlockStyle: 'fenced'
		} );

		turndownService.use([
			highlightedCodeBlock,
			taskListItems,
		]);

		// Replace images with appropriate source URLs derived from an attachment,
		// if any. Otherwise use the original src
		turndownService.addRule('img', {
			filter: 'img',

			replacement: function (content, node) {
			  var alt = node.alt || '';
			  var src = node.getAttribute(originalSrcAttribute) || node.getAttribute('src') || '';
			  var title = node.title || '';
			  var titlePart = title ? ' "' + title + '"' : '';

			  return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
			}
		});

		// Keep HTML tables and remove filler elements
		turndownService.addRule('htmlTables', {
			filter: ['table'],
			replacement: function (_content, node) {
				// Remove filler nodes
				node.querySelectorAll('td br[data-cke-filler]')
					.forEach((node) => node.remove());

				return node.outerHTML;
			}
		});

		turndownService.addRule('strikethrough', {
			filter: ['del', 's', 'strike'],
			replacement: function (content) {
			  return '~~' + content + '~~'
			}
		});

		turndownService.addRule( 'openProjectMacros', {
			filter: [ 'macro' ],
			replacement: ( _content, node ) => {
				node.innerHTML = '';
				return node.outerHTML;
			}
		});

		return turndownService.turndown( domFragment );
	}
}

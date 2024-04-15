// Inspiration taken from ReefJS
// https://github.com/cferdinandi/reef/blob/master/src/components/render.js

import { SimpleElement, SimpleNode } from '@simple-dom/interface';

// Form fields and attributes that can be modified by users
// They also have implicit values that make it hard to know if they were changed by the user or developer
const formFields = [ 'input', 'option', 'textarea' ];
const formAtts = [ 'value', 'checked', 'selected' ];
const formAttsNoVal = [ 'checked', 'selected' ];

/**
 * Check if an attribute string has a stringified falsy value
 * @param  {String}  str The string
 * @return {Boolean}     If true, value is falsy (yea, I know, that's a little confusing)
 */
const FALSY: Record<string, true> = { false: true, null: true, undefined: true, 0: true, '-0': true, NaN: true, '0n': true, '-0n': true };
function isFalsy(str: string) {
	return FALSY[str] || false;
}

/**
 * Check if attribute should be skipped (sanitize properties)
 * @param  {String}  name   The attribute name
 * @param  {String}  value  The attribute value
 * @return {Boolean}        If true, skip the attribute
 */
function skipAttribute(name: string, value: string) {
	const val = value.replace(/\s+/g, '').toLowerCase();
	if ([ 'src', 'href', 'xlink:href' ].includes(name)) {
		if (val.includes('javascript:') || val.includes('data:text/html')) return true;
	}
	if (name.startsWith('on') || name.startsWith('@on') || name.startsWith('#on')) return true;
  return false;
}

/**
 * Add an attribute to an element
 * @param {Node}   elem   The element
 * @param {String} att    The attribute
 * @param {String} val    The value
 * @param {Object} events The allowed event functions
 */
function addAttribute (elem: SimpleElement, att: string, val: string) {
	// Sanitize dangerous attributes
	if (skipAttribute(att, val)) return;

	// Update the attribute
	if(String(elem.getAttribute(att)) !== String(val)) {
    elem.setAttribute(att, val);
  }
}

/**
 * Compare the existing node attributes to the template node attributes and make updates
 * @param  {Node}   template The new template
 * @param  {Node}   existing The existing DOM node
 * @param  {Object} events   The allowed event functions
 */
function diffAttributes (template: SimpleElement, existing: SimpleElement) {

	// If the node is not an element, bail
	if (template.nodeType !== 1) return;

	// Get attributes for the template and existing DOM
	const templateAtts = Array.from(template.attributes);
	const existingAtts = Array.from(existing.attributes);

	// Add and update attributes from the template into the DOM
	for (const { name, value } of templateAtts) {

		// Skip [#*] attributes
		if (name.startsWith('#')) continue;

		// Skip user-editable form field attributes
		if (formAtts.includes(name) && formFields.includes(template.tagName.toLowerCase())) continue;

		// Convert [@*] names to their real attribute name
		const attName = name.startsWith('@') ? name.slice(1) : name;

		// If its a no-value property and it's falsy remove it
		if (formAttsNoVal.includes(attName) && isFalsy(value)) {
      existing.removeAttribute(attName);
			continue;
		}

		// Otherwise, add the attribute
		addAttribute(existing, attName, value);

	}

	// Remove attributes from the DOM that shouldn't be there
	for (const { name } of existingAtts) {

		// If the attribute exists in the template, skip it
		if (template.getAttribute(name) !== null) continue;

		// Skip user-editable form field attributes
		if (formAtts.includes(name) && formFields.includes(existing.tagName.toLowerCase())) continue;

		// Skip often runtime-edited style attributes for now...
		// TODO: This is here as a special case for the built in imageblur library.
		//       It should instead be handled by he imageblur script.
		if (name === 'style') { continue; }

		// Otherwise, remove it
    existing.removeAttribute(name);
	}

}

/**
 * Check if two nodes are different
 * @param  {Node}    node1 The first node
 * @param  {Node}    node2 The second node
 * @return {Boolean}       If true, they're not the same node
 */
function isDifferentNode(node1: SimpleNode, node2: SimpleNode) {
  if (node1.nodeType !== node2.nodeType) { return true; }

  if (node1.nodeType === 3 && node2.nodeType === 3) { return node1.nodeValue !== node2.nodeValue; }
  if (node1.nodeType === 8 && node2.nodeType === 8) { return node1.nodeValue !== node2.nodeValue; }

  if (node1.nodeType !== 1 || node2.nodeType !== 1) { return false; }

	// Script tags need to be re-done every time in order to re-run.
	if (node1.tagName?.toLowerCase() === 'script' && node1.getAttribute('vapid-rerun')) { return true; }

	return (
		(node1.tagName !== node2.tagName) ||
		((!!node1.getAttribute('id') || !!node2.getAttribute('id')) && node1.getAttribute('id') !== node2.getAttribute('id')) ||
		((!!node1.getAttribute('key') || !!node2.getAttribute('key')) && node1.getAttribute('key') !== node2.getAttribute('key')) ||
		((!!node1.getAttribute('src') || !!node2.getAttribute('src')) && node1.getAttribute('src') !== node2.getAttribute('src'))
	);
}

/**
 * Check if the desired node is further ahead in the current DOM tree branch
 * @param  {Node}     node     The node to look for
 * @param  {NodeList} existing The existing nodes in the DOM
 * @return {Node}              The element from the DOM
 */
function aheadInTree(node: SimpleNode, sibling: SimpleNode | null): SimpleNode | null {
	// If the node isn't an element, text, or comment, bail
	if (node.nodeType !== 1 && node.nodeType !== 3 && node.nodeType !== 8) return null;

  if (node.nodeType === 1) {
		// Script tags need to be re-done every time in order to re-run.
		if (node.tagName?.toLowerCase() === 'script' && node.getAttribute('vapid-rerun')) { return null; }

    // Look for the ID or [key] attribute
    const id = node.getAttribute('id');
    const key = node.getAttribute('key');
    const src = node.getAttribute('src');
    if (!id || !key || !src) return null;

    while (sibling) {
      if (sibling.nodeType !== 1) { continue; }
      if (id && sibling.getAttribute('id') === id) { return sibling; }
      if (key && sibling.getAttribute('key') === key) { return sibling; }
      if (src && sibling.getAttribute('src') === src) { return sibling; }
      sibling = sibling.nextSibling;
    }
  }

  if (node.nodeType === 3 || node.nodeType === 8) {
    while (sibling) {
      if (node.nodeValue === sibling.nodeValue) { return sibling; }
      sibling = sibling.nextSibling;
    }
  }

  return null;
}

/**
 * Diff the existing DOM node versus the template
 * @param  {Array}  template The template HTML
 * @param  {Node}   existing The current DOM HTML
 */
function update(template: SimpleNode, existing: SimpleNode): SimpleNode {

	// Get the nodes in the template and existing UI
	const templateNodes = template.childNodes;
	const existingNodes = existing.childNodes;

	// Loop through each node in the template and compare it to the matching element in the UI
  let i = 0;
  for (; i < templateNodes.length; i++) {
    const node = templateNodes[i];
    let existingNode = existingNodes[i];

		// If there's no existing element, create and append
		if (!existingNode) {
			const clone = node.cloneNode(true);
			existing.appendChild(clone);
			continue;
		}

		// If there is, but it's not the same node type...
		if (isDifferentNode(node, existingNode)) {

			// Check if node exists further in the tree
			const ahead = aheadInTree(node, existingNode.nextSibling);

			// If not, insert the new node before the current one
			if (!ahead) {
        existing.insertBefore(node.cloneNode(true), existingNode);
				continue;
			}

			// Otherwise, move existing node to the current spot
      existing.insertBefore(ahead, existingNode);
      existingNode = ahead;
		}

    if (node.nodeType !== 1 || existingNode.nodeType !== 1) { continue; }

		// If is an element node and attributes are different, update them
    diffAttributes(node, existingNode);

		// Stop diffing if a native web component
		if (node.nodeName.includes('-')) continue;

		// If there shouldn't be child nodes but there are, remove them
		if (!node.childNodes.length && existingNode.childNodes.length) {
      Array.from(existingNode.childNodes).map(child => existingNode.removeChild(child));
			continue;
		}

		// If DOM is empty and shouldn't be, build it up
		// This uses a document fragment to minimize reflows
		if (!existingNode.childNodes.length && node.childNodes.length) {
			existingNode.appendChild(update(node, existing.ownerDocument.createDocumentFragment()));
			continue;
		}

		// If there are nodes within it, recursively diff those
		if (node.childNodes.length) {
			update(node, existingNode);
		}
	}

	// If extra elements in DOM, remove them
  for (let i = existingNodes.length - 1; i >= templateNodes.length; i--) {
    existing.removeChild(existingNodes[i]);
  }

  return existing;
}

export default update;

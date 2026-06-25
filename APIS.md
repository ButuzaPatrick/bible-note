# APIs

```
get /ping - pings server (response = ok)
```

```
get /books - response = list of all books + abbreviations 
```

```
get /chapters/{book_abbrev} - response = list of all chapters in book abbreviation
```

```
get /verses/{book_abbrev}/{chapter} - response = list of all verses (with verse_number, chapter, book, id, book_abbrev, text)
```

Study Portals
MethodEndpointDescriptionGET/portalsAll saved portalsPOST/portalsCreate a new portalDELETE/portals/{id}Delete a portal
Layers
MethodEndpointDescriptionGET/portals/{portal_id}/layersAll layers for a portalPOST/portals/{portal_id}/layersCreate a layerPUT/layers/{id}Update layer name/colourDELETE/layers/{id}Delete a layer
Highlights
MethodEndpointDescriptionGET/layers/{layer_id}/highlightsAll highlights for a layerPOST/layers/{layer_id}/highlightsCreate a highlightDELETE/highlights/{id}Delete a highlight
Notes
MethodEndpointDescriptionGET/highlights/{highlight_id}/noteGet note for a highlightPOST/highlights/{highlight_id}/noteCreate/update noteDELETE/notes/{id}Delete a note
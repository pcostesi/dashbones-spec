package gospec

import (
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

// schema.json is the canonical Dashbones JSON Schema, generated from the
// TypeScript/Zod schema in this repository. It is the single source of truth
// that keeps the Go and TypeScript implementations in sync.
//
//go:embed schema.json
var schemaJSON []byte

var compiled *jsonschema.Schema

func init() {
	var err error
	compiled, err = jsonschema.CompileString("dashbones.json", string(schemaJSON))
	if err != nil {
		panic(fmt.Sprintf("gospec: failed to compile embedded schema: %v", err))
	}
}

// Validate checks raw wire-format bytes against the canonical JSON Schema and
// the Dashbones layout rules. It rejects unknown fields, missing required
// fields, out-of-range columns, invalid themes, and similarly encoded data.
//
// The JSON Schema (schema.json) encodes most of the contract, but the layout
// rules (Delta on even columns, no zoomed Delta, zoomed boxes on even columns)
// are cross-field constraints that cannot be expressed in JSON Schema. They
// mirror the ZoD .check() refinements and are enforced here so Go behavior
// stays consistent with the TypeScript implementation.
func Validate(data []byte) error {
	var v any
	if err := json.Unmarshal(data, &v); err != nil {
		return fmt.Errorf("gospec: invalid JSON: %w", err)
	}
	if err := compiled.Validate(v); err != nil {
		return fmt.Errorf("gospec: schema validation failed: %w", err)
	}
	var d Dashboard
	if err := json.Unmarshal(data, &d); err != nil {
		return fmt.Errorf("gospec: parse for layout check: %w", err)
	}
	if err := checkLayout(&d); err != nil {
		return err
	}
	return nil
}

// checkLayout enforces the cross-field layout rules documented by Dashbones.
func checkLayout(d *Dashboard) error {
	for i := range d.Boxes {
		b := &d.Boxes[i]
		switch b.Type {
		case BoxDelta:
			if b.Delta != nil {
				if b.Delta.Column%2 != 0 {
					return fmt.Errorf("gospec: Delta box %d must start on an even column, got %d", i, b.Delta.Column)
				}
				if b.Delta.BaseBox.Zoomed {
					return fmt.Errorf("gospec: Delta box %d cannot be zoomed", i)
				}
			}
		default:
			if b.zoomedColumn() && b.oddColumn() {
				return fmt.Errorf("gospec: zoomed box %d must be on an even column", i)
			}
		}
	}
	return nil
}

func (b *Box) zoomedColumn() bool {
	switch b.Type {
	case BoxSimple:
		return b.Simple != nil && bool(b.Simple.Zoomed)
	case BoxStacked, BoxStack:
		return b.Stacked != nil && bool(b.Stacked.Zoomed)
	case BoxTable:
		return b.Table != nil && bool(b.Table.Zoomed)
	case BoxChart:
		return b.Chart != nil && bool(b.Chart.Zoomed)
	case BoxImage:
		return b.Image != nil && bool(b.Image.Zoomed)
	}
	return false
}

func (b *Box) oddColumn() bool {
	switch b.Type {
	case BoxSimple:
		return b.Simple != nil && b.Simple.Column%2 != 0
	case BoxStacked, BoxStack:
		return b.Stacked != nil && b.Stacked.Column%2 != 0
	case BoxTable:
		return b.Table != nil && b.Table.Column%2 != 0
	case BoxChart:
		return b.Chart != nil && b.Chart.Column%2 != 0
	case BoxImage:
		return b.Image != nil && b.Image.Column%2 != 0
	}
	return false
}

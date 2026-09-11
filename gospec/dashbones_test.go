package gospec

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestUnmarshalDocsExample(t *testing.T) {
	data := []byte(`{
  "theme": "blue",
  "boxes": [
    { "zoomed": "true", "type": "Simple", "line1": "Hello", "row": 0, "column": 0 },
    { "type": "Stacked", "line1": "FOO", "line2": "BAR", "row": 0, "column": 2 }
  ]
}`)
	d, err := Unmarshal(data)
	if err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if d.Theme != ThemeBlue {
		t.Errorf("theme = %q, want blue", d.Theme)
	}
	if len(d.Boxes) != 2 {
		t.Fatalf("boxes = %d, want 2", len(d.Boxes))
	}
	if d.Boxes[0].Type != BoxSimple {
		t.Errorf("box[0] type = %q, want Simple", d.Boxes[0].Type)
	}
	if d.Boxes[0].Simple == nil || d.Boxes[0].Simple.Line1 != "Hello" {
		t.Errorf("box[0] simple = %+v", d.Boxes[0].Simple)
	}
	if d.Boxes[0].Simple == nil || !bool(d.Boxes[0].Simple.Zoomed) {
		t.Errorf("box[0] zoomed should decode string \"true\" to Bool(true)")
	}
	if d.Boxes[1].Stacked == nil || d.Boxes[1].Stacked.Line2 != "BAR" {
		t.Errorf("box[1] stacked = %+v", d.Boxes[1].Stacked)
	}
}

func TestRoundTrip(t *testing.T) {
	data := []byte(`{
  "theme": "red",
  "boxes": [
    { "zoomed": "true", "type": "Simple", "line1": "Q3", "row": 2, "column": 0 },
    { "type": "Chart", "data": [1, 2, 3, 2], "line1": "VISITS", "row": 4, "column": 0 },
    { "type": "Delta", "line1": "REVENUE", "delta": "+5.5%", "deltaPositive": "true", "row": 5, "column": 0 },
    { "type": "Image", "url": "https://example.com/img.png", "row": 0, "column": 1 }
  ]
}`)
	d, err := Unmarshal(data)
	if err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	out, err := Marshal(d)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	// Re-decode the marshaled output and confirm it stays schema-valid.
	var parsed any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("marshaled output is not valid JSON: %v", err)
	}
	if err := Validate(out); err != nil {
		t.Fatalf("marshaled output failed schema validation: %v\n%s", err, out)
	}

	var d2 Dashboard
	if err := json.Unmarshal(out, &d2); err != nil {
		t.Fatalf("re-unmarshal: %v", err)
	}
	if len(d2.Boxes) != 4 {
		t.Fatalf("round-tripped boxes = %d, want 4", len(d2.Boxes))
	}
}

func TestDeltaEvenColumnRejectedBySchema(t *testing.T) {
	// odd column for a delta
	data := []byte(`{"theme":"red","boxes":[
	  {"type":"Delta","line1":"x","row":0,"column":1}
	]}`)
	if err := Validate(data); err == nil {
		t.Fatal("expected schema validation to fail, got nil")
	} else {
		t.Logf("validation rejected as expected: %v", err)
	}
}

func TestDeltaEvenColumnAcceptedBySchema(t *testing.T) {
	data := []byte(`{"theme":"red","boxes":[
	  {"type":"Delta","line1":"x","row":0,"column":2}
	]}`)
	if err := Validate(data); err != nil {
		t.Fatalf("expected validation to pass, got: %v", err)
	}
}

func TestValidateRejectsUnknownTheme(t *testing.T) {
	data := []byte(`{"theme":"purple","boxes":[]}`)
	if err := Validate(data); err == nil {
		t.Fatal("expected invalid theme to be rejected")
	}
}

func TestValidateRejectsColumnOutOfRange(t *testing.T) {
	data := []byte(`{"theme":"red","boxes":[
	  {"type":"Simple","line1":"x","row":0,"column":4}
	]}`)
	if err := Validate(data); err == nil {
		t.Fatal("expected column 4 to be rejected")
	}
}

func TestValidateRejectsUnknownField(t *testing.T) {
	data := []byte(`{"theme":"red","boxes":[],"bogus":1}`)
	if err := Validate(data); err == nil {
		t.Fatal("expected unknown root field to be rejected")
	}
}

func TestValidateRejectsMalformedJSON(t *testing.T) {
	if err := Validate([]byte(`{"theme":`)); err == nil {
		t.Fatal("expected malformed JSON to be rejected")
	}
}

func TestBoolString(t *testing.T) {
	for _, tc := range []struct {
		in       string
		expected bool
	}{
		{`true`, true},
		{`false`, false},
		{`"true"`, true},
		{`"false"`, false},
	} {
		var b Bool
		if err := json.Unmarshal([]byte(tc.in), &b); err != nil {
			t.Fatalf("Unmarshal(%s): %v", tc.in, err)
		}
		if bool(b) != tc.expected {
			t.Errorf("Unmarshal(%s) = %v, want %v", tc.in, b, tc.expected)
		}
	}

	// Always marshals as a real boolean.
	out, err := json.Marshal(Bool(true))
	if err != nil {
		t.Fatal(err)
	}
	if string(out) != "true" {
		t.Errorf("Marshal(Bool(true)) = %s, want true", out)
	}
}

func TestRootOverridesRoundTrip(t *testing.T) {
	data := []byte(`{
  "theme": "dark",
  "text": { "red": 255, "green": 255, "blue": 255, "alpha": 1 },
  "positive": { "red": 0, "green": 255, "blue": 0, "alpha": 0.8 },
  "boxes": []
}`)
	d, err := Unmarshal(data)
	if err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if d.Text == nil || d.Text.Green != 255 {
		t.Fatalf("text override not parsed: %+v", d.Text)
	}
	if d.Positive == nil || d.Positive.Alpha != 0.8 {
		t.Fatalf("positive override not parsed: %+v", d.Positive)
	}
	out, err := Marshal(d)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if err := Validate(out); err != nil {
		t.Fatalf("marshaled output failed validation: %v\n%s", err, out)
	}
}

func TestUnmarshalRejectsUnknownBoxType(t *testing.T) {
	data := []byte(`{"theme":"red","boxes":[
	  {"type":"Widget","row":0,"column":0}
	]}`)
	_, err := Unmarshal(data)
	if err == nil || !strings.Contains(err.Error(), "unknown box type") {
		t.Fatalf("expected unknown box type error, got: %v", err)
	}
}

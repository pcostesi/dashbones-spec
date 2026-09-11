# Dashbones spec — pipeline automation.
#
# Derivation chain (everything is derived, nothing is hand-written except the
# TS/Zod source and this pipeline):
#   src/schema.ts  ->  gospec/schema.json (gen-schema, via Zod toJSONSchema)
#   gospec/schema.json  ->  gospec/dashbones.go + gospec/validate.go (gen-go)
#
# So "re-doing" the pipeline means:
#   1. regenerate the canonical JSON Schema from Zod
#   2. regenerate the Go package from the JSON Schema
#   3. confirm both are unchanged (or commit the changes)
#   4. verify the Go package still builds, vets, and passes; run both test suites

.PHONY: all check gen gen-schema gen-go sync-check test test-ts test-go build build-ts build-go vet typecheck clean

all: check

# Regenerate the canonical JSON Schema from the Zod source of truth.
gen-schema:
	npm run gen:schema

# Regenerate the Go package from the canonical JSON Schema and gofmt it.
gen-go:
	npm run gen:go
	cd gospec && gofmt -w dashbones.go validate.go

gen: gen-schema gen-go

# Regenerate everything, then fail if any committed derived artifact drifted.
sync-check: gen
	git diff --exit-code gospec/schema.json gospec/dashbones.go gospec/validate.go

typecheck:
	npm run typecheck

test-ts:
	npm test

test-go:
	cd gospec && go test ./...

test: test-ts test-go

build-ts:
	npm run build

build-go:
	cd gospec && go build ./...

build: build-ts build-go

vet:
	cd gospec && go vet ./...

# Full re-do: regenerate schema + Go, typecheck TS, vet/build Go, run both suites.
check: gen typecheck vet build test

clean:
	rm -rf dist gospec/tmp
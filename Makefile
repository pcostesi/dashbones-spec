# Dashbones spec — pipeline automation.
#
# Only the TS/Zod source (src/) and this pipeline are hand-written. Everything
# else is derived:
#   src/schema.ts  ->  gospec/schema.json (gen-schema, via Zod toJSONSchema)
#   gospec/schema.json  ->  gospec/dashbones.go + gospec/validate.go (gen-go)
#
# The generated artifacts are COMMITTED so the Go module is self-contained
# (validate.go embeds schema.json) and any tag or branch builds cleanly.
# CI enforces they stay in sync with the Zod source (sync-check) and uploads
# them as a build artifact.

.PHONY: all check gen gen-schema gen-go sync-check test test-ts test-go build build-ts build-go vet clean

all: check

# Regenerate the canonical JSON Schema from the Zod source of truth.
gen-schema:
	npm run gen:schema

# Regenerate the Go package from the canonical JSON Schema and gofmt it.
gen-go:
	npm run gen:go
	cd gospec && gofmt -w dashbones.go validate.go

gen: gen-schema gen-go

# Drift gate: regenerate everything, then require the committed generated
# artifacts to be untouched. Fails if a developer changed sources without
# regenerating (or hand-edited generated code). CI runs this on every change.
sync-check: gen
	git diff --exit-code -- gospec/schema.json gospec/dashbones.go gospec/validate.go

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

# Full re-do: generate artifacts (schema + Go), typecheck TS, vet/build Go,
# run both suites.
check: gen typecheck vet build test

clean:
	rm -rf dist gospec/tmp
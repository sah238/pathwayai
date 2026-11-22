/**
 * Server-only entry point to the dataset. Importing this from a Client
 * Component is a build error.
 *
 * The JSON is imported at module scope, so it is read and validated once per
 * server process (and during prerender). With Cache Components on, module
 * imports are predictable values and need no "use cache" or Suspense boundary.
 * An invalid data file throws DataValidationError on first import.
 */
import "server-only";
import institutionsJson from "@/data/institutions.json";
import occupationsJson from "@/data/occupations.json";
import { repositoryFromRaw, type DataRepository } from "./repository";

const repository = repositoryFromRaw(occupationsJson, institutionsJson);

export function getRepository(): DataRepository {
  return repository;
}

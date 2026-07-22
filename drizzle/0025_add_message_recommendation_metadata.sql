ALTER TABLE `messages`
  ADD COLUMN `recommendationMetadata` json NULL AFTER `content`;

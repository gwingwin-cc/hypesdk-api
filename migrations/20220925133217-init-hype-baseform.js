'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE TABLE \`hype_base_form\` (
                                 \`id\` int(11) NOT NULL AUTO_INCREMENT,
                                 \`recordState\` enum('DRAFT','ACTIVE','ACTIVE_LOCK','CANCEL','ARCHIVED') DEFAULT NULL,
                                 \`errors\` varchar(255) DEFAULT NULL,
                                 \`createdAt\` datetime NOT NULL,
                                 \`updatedAt\` datetime DEFAULT NULL,
                                 \`deletedAt\` datetime DEFAULT NULL,
                                 \`createdBy\` int(11) DEFAULT NULL,
                                 \`updatedBy\` int(11) DEFAULT NULL,
                                 \`deletedBy\` int(11) DEFAULT NULL,
                                 PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('hype_base_form');
  },
};

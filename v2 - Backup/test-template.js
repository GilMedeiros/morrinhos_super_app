const template = JSON.stringify({
    phone: "{phone}",
    name: "{name}",
    agendamento: "{agendamento}",
    procedimento: "{procedimento}",
    profissional: "{profissional}",
    test: false
}, null, 2);

console.log('Template padrão:');
console.log(template);
console.log('\nTestando validação...');

try {
    const testTemplate = template
        .replace(/"\{phone\}"/g, '"123456789"')
        .replace(/\{phone\}/g, '"123456789"')
        .replace(/"\{name\}"/g, '"Test Name"')
        .replace(/\{name\}/g, '"Test Name"')
        .replace(/"\{agendamento\}"/g, '"2024-01-01T10:00:00"')
        .replace(/\{agendamento\}/g, '"2024-01-01T10:00:00"')
        .replace(/"\{procedimento\}"/g, '"Test Procedure"')
        .replace(/\{procedimento\}/g, '"Test Procedure"')
        .replace(/"\{profissional\}"/g, '"Dr. Test"')
        .replace(/\{profissional\}/g, '"Dr. Test"')
        .replace(/"\{test\}"/g, 'false')
        .replace(/\{test\}/g, 'false');
    
    console.log('Template processado:');
    console.log(testTemplate);
    
    const parsed = JSON.parse(testTemplate);
    console.log('\nJSON válido! Resultado:');
    console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
    console.error('Erro na validação:', error.message);
}
